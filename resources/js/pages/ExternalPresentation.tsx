import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { useExternalPresentationReceiver } from '@/hooks/useExternalPresentation';
import { SplitViewReader } from '@/components/SplitViewReader';

/**
 * External Presentation Viewer — No controls, no sidebar.
 * This page is opened in external windows/displays and shows
 * only the current slide content, synchronized from the controller.
 */
export default function ExternalPresentation() {
    const state = useExternalPresentationReceiver();

    // Auto-enter fullscreen
    useEffect(() => {
        const handleClick = () => {
            document.documentElement.requestFullscreen?.().catch(() => { });
        };
        // First click will trigger fullscreen
        document.addEventListener('click', handleClick, { once: true });
        return () => document.removeEventListener('click', handleClick);
    }, []);

    if (!state) {
        return (
            <div className="presentation-bg external-pres-root" dir="rtl">
                <Head title="عرض خارجي" />
                <div className="flex flex-col items-center gap-6 text-center">
                    {/* Waiting spinner */}
                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-2xl font-serif text-muted-foreground">
                        في انتظار بدء العرض...
                    </p>
                    <p className="text-sm text-muted-foreground/60">
                        اضغط في أي مكان للدخول في وضع ملء الشاشة
                    </p>
                </div>
            </div>
        );
    }

    const { slide, copticDate, seasonLabel, slideIndex, totalSlides } = state;

    return (
        <div className="presentation-bg external-pres-root" dir="rtl">
            <Head title={`عرض - ${copticDate}`} />

            {/* Slide content */}
            <div className="slide-viewport" key={slideIndex}>
                <div className="w-full max-w-7xl mx-auto flex flex-col items-center slide-enter">
                    {/* Section Header with Coptic Ornaments */}
                    <div className="mb-8 slide-section-header text-xl md:text-3xl">
                        <span className="ornament" aria-hidden="true" />
                        <span>{slide.section_name}</span>
                        <span className="ornament" aria-hidden="true" />
                    </div>

                    {/* Intonation badge */}
                    {slide.intonation_ar && (
                        <div className="mb-8 intonation-badge text-base md:text-lg">
                            {slide.intonation_ar}
                        </div>
                    )}

                    {/* Decorative rule */}
                    <div className="ornamental-rule mb-10">
                        <span className="ornament-diamond" />
                    </div>

                    {/* Content */}
                    <div className="slide-content-enter w-full">
                        <SplitViewReader
                            lines={slide.lines}
                            hasCoptic={slide.has_coptic}
                            justified={true}
                            className="flex flex-col w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Progress bar at bottom */}
            <div className="slide-progress">
                <div
                    className="slide-progress-bar"
                    style={{ width: `${((slideIndex + 1) / totalSlides) * 100}%` }}
                />
            </div>
        </div>
    );
}
