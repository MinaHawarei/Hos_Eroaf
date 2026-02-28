import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

export function usePresentationNavigation(
    slides: any[],
    currentSlideIndex: number,
    setCurrentSlideIndex: (index: number) => void
) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                if (currentSlideIndex < slides.length - 1) {
                    setCurrentSlideIndex(currentSlideIndex + 1);
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (currentSlideIndex > 0) {
                    setCurrentSlideIndex(currentSlideIndex - 1);
                }
            } else if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(console.error);
                } else {
                    router.visit('/'); // or back to reader
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlideIndex, slides.length, setCurrentSlideIndex]);

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
