import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { Head } from '@inertiajs/react';
import { useSync } from '@/hooks/useSync';
import { SplitViewReader } from '@/components/SplitViewReader';
import AppLogoIcon from '@/components/AppLogoIcon';
import {
    linesHaveCopticScript,
    resolveMultiColumnMode,
} from '@/utils/presentationLayout';

/**
 * ChromaMirror — Broadcast-ready chroma-key presentation mode.
 *
 * - Green (#00b140) background for chroma keying
 * - Text at bottom of screen with semi-transparent container
 * - No title/header — only text content
 * - TV-safe margins (5% inset)
 * - App logo displayed initially with fade-in animation
 */
export default function ChromaMirror() {
    const { state } = useSync('receiver');
    const [interactivityEnabled, setInteractivityEnabled] = useState(true);
    const [showLogo, setShowLogo] = useState(true);
    const [logoExiting, setLogoExiting] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(400);

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

    // Hide logo after first state arrives (with exit animation)
    useEffect(() => {
        if (state && state.currentSlide && showLogo) {
            // Start exit animation
            setLogoExiting(true);
            const timer = setTimeout(() => {
                setShowLogo(false);
                setLogoExiting(false);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [state, showLogo]);

    // Measure container height for dynamic layout
    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;

        const ro = new ResizeObserver((entries) => {
            const h = entries[0]?.contentRect.height;
            if (h && h > 0) {
                setContainerHeight(Math.floor(h));
            }
        });
        ro.observe(el);
        setContainerHeight(Math.floor(el.getBoundingClientRect().height) || 400);
        return () => ro.disconnect();
    }, []);

    // Waiting/Logo state
    if (!state || !state.currentSlide) {
        return (
            <div
                className="chroma-bg h-screen w-screen flex items-center justify-center overflow-hidden"
                style={{ cursor: interactivityEnabled ? 'default' : 'none' }}
            >
                <Head title="Chroma Mode — Broadcast" />
                <div className="chroma-safe-area">
                    <div className={`flex flex-col items-center gap-6 ${showLogo ? 'chroma-logo-enter' : ''}`}>
                        <AppLogoIcon className="h-32 w-32 text-white drop-shadow-2xl" />
                        <h1 className="text-white text-4xl font-bold font-serif tracking-wide drop-shadow-lg">
                            هوس إيروف
                        </h1>
                        <p className="text-white/60 text-lg animate-pulse" dir="rtl">
                            {interactivityEnabled
                                ? 'اضغط في أي مكان لتفعيل ملء الشاشة...'
                                : 'في انتظار بدء العرض...'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const { currentSlide, activeAlternativeIndex, effectiveFontSize, readerPageIndex, slideId } = state;

    // Resolve which lines to display
    let displayLines = currentSlide.lines || [];
    let displayHasCoptic = currentSlide.has_coptic || false;

    if (currentSlide.has_alternatives && currentSlide.alternatives) {
        const alt = currentSlide.alternatives[activeAlternativeIndex];
        if (alt) {
            displayLines = alt.lines || [];
            displayHasCoptic = alt.has_coptic || false;
        }
    }

    // Use all lines according to mode logic
    const finalLines = displayLines;

    // Max height for text — bottom 40% of the safe area for lower-thirds
    const textMaxHeight = Math.max(200, containerHeight * 0.45);

    return (
        <div
            className="chroma-bg h-screen w-screen overflow-hidden select-none"
            dir="rtl"
            style={{
                cursor: interactivityEnabled ? 'default' : 'none',
                '--pres-font-size': `${effectiveFontSize ?? 28}px`,
                userSelect: 'none',
            } as React.CSSProperties}
        >
            <Head title="Chroma Mode — Broadcast" />

            {/* Logo overlay — shows initially then fades out */}
            {showLogo && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center ${logoExiting ? 'chroma-logo-exit' : 'chroma-logo-enter'}`}>
                    <div className="flex flex-col items-center gap-6">
                        <AppLogoIcon className="h-32 w-32 text-white drop-shadow-2xl" />
                        <h1 className="text-white text-4xl font-bold font-serif tracking-wide drop-shadow-lg">
                            هوس إيروف
                        </h1>
                    </div>
                </div>
            )}

            {/* TV-safe area with text at bottom */}
            <div ref={containerRef} className="chroma-safe-area">
                <div className="chroma-text-container">
                    <SplitViewReader
                        key={`chroma-${slideId}-${activeAlternativeIndex}`}
                        initialPage={readerPageIndex ?? 0}
                        lines={finalLines}
                        hasCoptic={displayHasCoptic}
                        justified={true}
                        className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center"
                        fontSizePx={effectiveFontSize ?? 28}
                        maxContentHeight={textMaxHeight}
                        chromaMode={true}
                    />
                </div>
            </div>
        </div>
    );
}
