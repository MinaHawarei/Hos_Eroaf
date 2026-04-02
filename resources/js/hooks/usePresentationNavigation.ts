import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

/**
 * usePresentationNavigation Hook
 * 
 * Manages keyboard shortcuts, manual navigation, and fullscreen state for the 
 * presentation viewer.
 * 
 * @param slides - The array of current slides.
 * @param currentSlideIndex - Current slide index.
 * @param setCurrentSlideIndex - Setter for the slide index.
 * @param onNext - Optional callback for custom 'Next' logic (e.g., page-based sub-navigation).
 * @param onPrev - Optional callback for custom 'Previous' logic.
 */
export function usePresentationNavigation(
    slides: any[],
    currentSlideIndex: number,
    setCurrentSlideIndex: (index: number) => void,
    onNext?: () => void,
    onPrev?: () => void
) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Forward navigation (Right Arrow / Space)
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                if (onNext) onNext();
                else if (currentSlideIndex < slides.length - 1) {
                    setCurrentSlideIndex(currentSlideIndex + 1);
                }
            } 
            // Backward navigation (Left Arrow)
            else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (onPrev) onPrev();
                else if (currentSlideIndex > 0) {
                    setCurrentSlideIndex(currentSlideIndex - 1);
                }
            } 
            // Exit Fullscreen or go Home (Escape)
            else if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(console.error);
                } else {
                    router.visit('/'); // Return to Dashboard if not in fullscreen
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlideIndex, slides.length, setCurrentSlideIndex, onNext, onPrev]);

    /** Toggles native browser fullscreen for the entire document */
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen().catch(console.error);
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen().catch(console.error);
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return {
        isFullscreen,
        toggleFullscreen,
        nextSlide: () => currentSlideIndex < slides.length - 1 && setCurrentSlideIndex(currentSlideIndex + 1),
        prevSlide: () => currentSlideIndex > 0 && setCurrentSlideIndex(currentSlideIndex - 1),
    };
}
