import React, { useEffect, useState, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import { useSync } from '@/hooks/useSync';
import { SplitViewReader } from '@/components/SplitViewReader';

/**
 * MirrorComponent — Synchronized mirror display that replicates
 * the active presentation state exactly.
 *
 * Features:
 * - Fully mirrors the main presentation's current slide
 * - Correctly displays alternatives (only the active one)
 * - Dynamic layout with ResizeObserver for proper text fitting
 * - Matches transitions and layout logic from the main view
 */
export default function MirrorComponent() {
    const { state } = useSync('receiver');
    const [interactivityEnabled, setInteractivityEnabled] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(400);
    const [headerHeight, setHeaderHeight] = useState(0);

    // Enter fullscreen on initialization (or first click if browser blocks auto)
    useEffect(() => {
        const enterFullscreen = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
            setInteractivityEnabled(false);
        };

        // Try immediately
        enterFullscreen();

        // Also bind to click as fallback
        document.addEventListener('click', enterFullscreen, { once: true });

        const channel = new BroadcastChannel('presentation_sync');
        const handleBeforeUnload = () => {
            channel.postMessage({ type: 'MIRROR_CLOSED' });
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('click', enterFullscreen);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            channel.close();
        };
    }, []);

    // Measure content area height dynamically
    useLayoutEffect(() => {
        const el = contentRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;

        const ro = new ResizeObserver((entries) => {
            const h = entries[0]?.contentRect.height;
            if (h && h > 0) {
                setContentHeight(Math.floor(h));
            }
        });
        ro.observe(el);
        setContentHeight(Math.floor(el.getBoundingClientRect().height) || 400);
        return () => ro.disconnect();
    }, []);

    // Measure header height dynamically
    useLayoutEffect(() => {
        const el = headerRef.current;
        if (!el) return;

        const measure = () => {
            const h = el.getBoundingClientRect().height;
            if (h > 0) setHeaderHeight(Math.ceil(h));
        };

        measure();

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(measure);
            ro.observe(el);
            return () => ro.disconnect();
        }
    }, [state?.slideId]);

    // Compute effective reader height (matching PresentationPage logic)
    const effectiveReaderHeight = useMemo(() => {
        const PADDING = 44; // top + bottom padding + safety margin
        return Math.max(200, contentHeight - headerHeight - PADDING);
    }, [contentHeight, headerHeight]);

    if (!state || !state.currentSlide) {
        return (
            <div
                className="presentation-bg flex h-screen w-screen items-center justify-center overflow-hidden"
                style={{ cursor: interactivityEnabled ? 'default' : 'none' }}
            >
                <Head title="Mirror Mode — Presentation" />
                <div className="flex flex-col items-center gap-8 text-center p-6">
                    <div className="h-20 w-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground font-serif text-lg animate-pulse" dir="rtl">
                        {interactivityEnabled
                            ? 'اضغط في أي مكان لتفعيل ملء الشاشة والبدء...'
                            : 'في انتظار بدء العرض من الشاشة الرئيسية...'}
                    </p>
                </div>
            </div>
        );
    }

    const { currentSlide, activeAlternativeIndex, effectiveFontSize, readerPageIndex, slideId } = state;

    // Resolve the active alternative — only display the currently selected one
    let displayLines = currentSlide.lines || [];
    let displayHasCoptic = currentSlide.has_coptic || false;
    let displayIntonation = currentSlide.intonation || null;
    let displayConclusion = currentSlide.conclusion || null;

    if (currentSlide.has_alternatives && currentSlide.alternatives) {
        const activeAlt = currentSlide.alternatives[activeAlternativeIndex];
        if (activeAlt) {
            displayLines = activeAlt.lines || [];
            displayHasCoptic = activeAlt.has_coptic || false;
            // Alternatives typically don't have separate intonation/conclusion
            displayIntonation = null;
            displayConclusion = null;
        }
    }

    return (
        <div
            className={`presentation-bg h-screen w-screen overflow-hidden select-none flex flex-col ${interactivityEnabled ? '' : 'pointer-events-none'}`}
            dir="rtl"
            style={{
                cursor: interactivityEnabled ? 'default' : 'none',
                '--pres-font-size': `${effectiveFontSize}px`,
                userSelect: 'none',
            } as React.CSSProperties}
        >
            <Head title="Mirror View — Presentation" />

            <main className="flex h-full min-h-0 flex-1 flex-col items-center justify-start overflow-hidden px-8 pt-4 pb-5 md:px-10 md:pt-5 md:pb-5">
                <div className="pres-slide-column flex min-h-0 w-full max-w-none flex-1 flex-col justify-start">
                    {/* Slide Header — mirrors the main presentation exactly */}
                    <div ref={headerRef} className="flex w-full flex-shrink-0 flex-col items-center">
                        <div className="slide-section-header pres-section-header-scale mb-3 text-center md:mb-4">
                            <span className="ornament" aria-hidden="true" />
                            <span>{currentSlide.section_name}</span>
                            <span className="ornament" aria-hidden="true" />
                        </div>
                        <div className="ornamental-rule mb-3 md:mb-4">
                            <span className="ornament-diamond" />
                        </div>
                    </div>

                    {/* Reader Content — dynamic height matching */}
                    <div ref={contentRef} className="flex min-h-0 w-full flex-1 flex-col justify-center overflow-hidden">
                        <SplitViewReader
                            key={`mirror-${slideId}-${activeAlternativeIndex}`}
                            initialPage={readerPageIndex ?? 0}
                            lines={displayLines}
                            hasCoptic={displayHasCoptic}
                            justified={true}
                            className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center"
                            fontSizePx={effectiveFontSize ?? 28}
                            maxContentHeight={effectiveReaderHeight}
                            intonation={displayIntonation}
                            conclusion={displayConclusion}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
