import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { Head } from '@inertiajs/react';
import { useSync } from '@/hooks/useSync';

/**
 * Text style constants for chroma keying.
 * All text uses white with 1px black outline for maximum visibility.
 */
const CHROMA_TEXT_SHADOW = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
const CHROMA_GREEN = '#00b140';

interface ChromaLine {
    id: number;
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    text: string;
    speaker?: string;
}

interface ChromaRow {
    arabic: string;
    copticArabized: string;
    copticScript: string;
    speaker?: string;
}

/**
 * Groups flat lines into integrated rows by language type.
 */
function groupLinesIntoRows(lines: ChromaLine[]): ChromaRow[] {
    const arabicLines: ChromaLine[] = [];
    const arcopticLines: ChromaLine[] = [];
    const copticLines: ChromaLine[] = [];

    for (const line of lines) {
        if (line.lang_type === 'arabic') arabicLines.push(line);
        else if (line.lang_type === 'coptic_arabized') arcopticLines.push(line);
        else if (line.lang_type === 'coptic') copticLines.push(line);
    }

    const maxRows = Math.max(arabicLines.length, arcopticLines.length, copticLines.length);
    const rows: ChromaRow[] = [];

    for (let i = 0; i < maxRows; i++) {
        rows.push({
            arabic: arabicLines[i]?.text || '',
            copticArabized: arcopticLines[i]?.text || '',
            copticScript: copticLines[i]?.text || '',
            speaker: arabicLines[i]?.speaker || arcopticLines[i]?.speaker || copticLines[i]?.speaker,
        });
    }

    return rows;
}

/**
 * ChromaMirror Component
 *
 * A specialized presentation mode designed for live broadcasting and chroma keying.
 * Provides a pure green (#00b140) background that can be removed by broadcasting
 * software (e.g., OBS, vMix) to overlay liturgical text on video.
 *
 * Design:
 * - Pure chroma green background with NO overlays or semi-transparent elements.
 * - All text is white with 1px black outline for maximum contrast.
 * - Text area is capped at 150px max height.
 * - Renders rows directly (no SplitViewReader).
 */
export default function ChromaMirror() {
    const { state } = useSync('receiver');
    const [interactivityEnabled, setInteractivityEnabled] = useState(true);
    const [showLogo, setShowLogo] = useState(true);
    const [logoExiting, setLogoExiting] = useState(false);

    /**
     * Initialization effect:
     * 1. Attempts to enter fullscreen mode.
     * 2. Sets up the BroadcastChannel for master-mirror communication.
     * 3. Handles window teardown notifications.
     */
    useEffect(() => {
        const enterFullscreen = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
            setInteractivityEnabled(false);
        };

        enterFullscreen();
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

    /**
     * Logo lifecycle effect. Transitions the initial splash logo out
     * once the first piece of presentation state is received.
     */
    useEffect(() => {
        if (state && state.currentSlide && showLogo) {
            setLogoExiting(true);
            const timer = setTimeout(() => {
                setShowLogo(false);
                setLogoExiting(false);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [state, showLogo]);

    // Render the initial "Waiting/Splash" state with the app logo
    if (!state || !state.currentSlide) {
        return (
            <div
                className="h-screen w-screen flex items-center justify-center overflow-hidden"
                style={{
                    backgroundColor: CHROMA_GREEN,
                    cursor: interactivityEnabled ? 'default' : 'none',
                }}
            >
                <Head title="Chroma Mode — Broadcast" />
                <div className="flex flex-col items-center gap-6">
                    <img
                        src="/icon.png"
                        alt="هوس إيروف"
                        style={{
                            height: 160,
                            width: 160,
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 0 8px #000)',
                        }}
                        draggable={false}
                    />
                    <h1
                        style={{
                            color: '#fff',
                            fontSize: 36,
                            fontWeight: 700,
                            textShadow: CHROMA_TEXT_SHADOW,
                        }}
                    >
                        هوس إيروف
                    </h1>
                    <p
                        style={{
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: 18,
                            textShadow: CHROMA_TEXT_SHADOW,
                        }}
                        className="animate-pulse"
                        dir="rtl"
                    >
                        {interactivityEnabled
                            ? 'Click anywhere to enable fullscreen...'
                            : 'Waiting for presentation to start...'}
                    </p>
                </div>
            </div>
        );
    }

    const { currentSlide, activeAlternativeIndex, effectiveFontSize, readerPageIndex, slideId } = state;

    // Resolve which lines to display — handle alternatives
    let displayLines: ChromaLine[] = currentSlide.lines || [];
    let displayIntonation: string | null = currentSlide.intonation || null;
    let displayConclusion: string | null = currentSlide.conclusion || null;

    if (currentSlide.has_alternatives && currentSlide.alternatives) {
        const alt = currentSlide.alternatives[activeAlternativeIndex]
            ?? currentSlide.alternatives[0];
        if (alt) {
            displayLines = alt.lines || [];
            displayIntonation = null;
            displayConclusion = null;
        }
    } else if (!displayLines.length) {
        // slide has no lines at all — render nothing, keep green bg
    }

    // Group lines into integrated rows
    const rows = groupLinesIntoRows(displayLines);

    // Determine column count
    const hasArabic = rows.some(r => r.arabic.trim().length > 0);
    const hasCopticArabized = rows.some(r => r.copticArabized.trim().length > 0);
    const hasCopticScript = rows.some(r => r.copticScript.trim().length > 0);
    const columnCount = (hasArabic ? 1 : 0) + (hasCopticArabized ? 1 : 0) + (hasCopticScript ? 1 : 0);

    // Extract speaker from first line (post-split, each slide should have one speaker)
    const speaker = rows[0]?.speaker;

    // Common text style for all chroma text
    const chromaTextStyle: React.CSSProperties = {
        color: '#ffffff',
        textShadow: CHROMA_TEXT_SHADOW,
        fontWeight: 'bold',
        fontSize: `var(--pres-font-size, ${effectiveFontSize ?? 28}px)`,
        lineHeight: 1.55,
        textAlign: 'center',
        wordBreak: 'break-word' as const,
    };

    // Divider style: white line with black outline
    const dividerStyle: React.CSSProperties = {
        width: 2,
        alignSelf: 'stretch',
        flexShrink: 0,
        backgroundColor: '#fff',
        boxShadow: '0 0 0 1px #000',
    };

    return (
        <div
            className="h-screen w-screen overflow-hidden select-none"
            dir="rtl"
            style={{
                backgroundColor: CHROMA_GREEN,
                cursor: interactivityEnabled ? 'default' : 'none',
                '--pres-font-size': `${effectiveFontSize ?? 28}px`,
                userSelect: 'none',
            } as React.CSSProperties}
        >
            <Head title="Chroma Mode — Broadcast" />

            {/* Logo overlay — shows initially then fades out */}
            {showLogo && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center ${logoExiting ? 'chroma-logo-exit' : 'chroma-logo-enter'}`}
                    style={{ backgroundColor: CHROMA_GREEN }}
                >
                    <div className="flex flex-col items-center gap-6">
                        <img
                            src="/icon.png"
                            alt="هوس إيروف"
                            style={{
                                height: 128,
                                width: 128,
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 0 8px #000)',
                            }}
                            draggable={false}
                        />
                        <h1
                            style={{
                                color: '#fff',
                                fontSize: 36,
                                fontWeight: 700,
                                textShadow: CHROMA_TEXT_SHADOW,
                            }}
                        >
                            هوس إيروف
                        </h1>
                    </div>
                </div>
            )}

            {/* Top-right logo — always visible */}
            <div
                style={{
                    position: 'fixed',
                    top: '4%',
                    right: '4%',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                <img
                    src="/icon.png"
                    alt="هوس إيروف"
                    style={{
                        height: 36,
                        width: 36,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 3px #000)',
                    }}
                    draggable={false}
                />
                <span
                    style={{
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 16,
                        textShadow: CHROMA_TEXT_SHADOW,
                    }}
                >
                    هوس إيروف
                </span>
            </div>

            {/* Main content area — positioned at the bottom of the screen */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '5%',
                    left: '5%',
                    right: '5%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {/* Speaker name — if present */}
                {speaker && (
                    <>
                        <div
                            style={{
                                ...chromaTextStyle,
                                fontSize: `calc(var(--pres-font-size, ${effectiveFontSize ?? 28}px) * 0.6)`,
                                marginBottom: 6,
                            }}
                        >
                            {speaker}
                        </div>
                        {/* Thin white divider line */}
                        <div
                            style={{
                                width: '100%',
                                height: 1,
                                backgroundColor: '#fff',
                                boxShadow: '0 0 0 1px #000',
                                marginBottom: 8,
                            }}
                        />
                    </>
                )}

                {/* Rows container — max height 150px */}
                <div
                    style={{
                        maxHeight: '150px',
                        overflow: 'hidden',
                        width: '100%',
                    }}
                >
                    {rows.map((row, rowIdx) => {
                        const showAr = row.arabic.trim().length > 0;
                        const showArcop = row.copticArabized.trim().length > 0;
                        const showCop = row.copticScript.trim().length > 0;

                        if (!showAr && !showArcop && !showCop) return null;

                        // Single column mode
                        if (columnCount <= 1) {
                            const text = showAr ? row.arabic : showArcop ? row.copticArabized : row.copticScript;
                            const isCopticScript = !showAr && !showArcop && showCop;
                            return (
                                <p
                                    key={`chroma-row-${rowIdx}`}
                                    style={chromaTextStyle}
                                    dir={isCopticScript ? 'ltr' : 'rtl'}
                                    className={isCopticScript ? 'pres-coptic-text' : 'font-reading pres-arabic-text'}
                                >
                                    {text}
                                </p>
                            );
                        }

                        // Multi-column mode
                        return (
                            <div
                                key={`chroma-row-${rowIdx}`}
                                style={{
                                    display: 'flex',
                                    width: '100%',
                                    alignItems: 'stretch',
                                    gap: 12,
                                }}
                            >
                                {showAr && (
                                    <div style={{ flex: '42', minWidth: 0 }}>
                                        <p
                                            style={chromaTextStyle}
                                            dir="rtl"
                                            className="font-reading pres-arabic-text"
                                        >
                                            {row.arabic}
                                        </p>
                                    </div>
                                )}

                                {showAr && (showArcop || showCop) && (
                                    <div style={dividerStyle} />
                                )}

                                {showArcop && (
                                    <div style={{ flex: '58', minWidth: 0 }}>
                                        <p
                                            style={chromaTextStyle}
                                            dir="rtl"
                                            className="font-reading pres-arabic-text"
                                        >
                                            {row.copticArabized}
                                        </p>
                                    </div>
                                )}

                                {showCop && (showAr || showArcop) && (
                                    <div style={dividerStyle} />
                                )}

                                {showCop && (
                                    <div style={{ flex: '40', minWidth: 0 }}>
                                        <p
                                            style={{ ...chromaTextStyle, textAlign: 'center' }}
                                            dir="ltr"
                                            className="pres-coptic-text"
                                        >
                                            {row.copticScript}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
