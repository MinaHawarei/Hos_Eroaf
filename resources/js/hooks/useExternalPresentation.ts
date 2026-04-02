import { useEffect, useRef, useCallback, useState } from 'react';

const CHANNEL_NAME = 'hos-erof-presentation';

/**
 * Defines the state structure sent to the external mirror.
 */
interface PresentationState {
    /** Current slide index */
    slideIndex: number;
    /** Current slide data object */
    slide: any;
    /** Formatted Coptic date string */
    copticDate: string;
    /** Current liturgical season name */
    seasonLabel: string;
    /** Overall slide count */
    totalSlides: number;
}

/**
 * Generates the full, self-contained HTML for an external mirror window. 
 * 
 * This 'Zero-Route' approach avoids server roundtrips by:
 * 1. Cloning all active stylesheets and <style> tags from the current document.
 * 2. Injecting a vanilla JS renderer that listens to BroadcastChannel.
 * 3. Writing the result directly into an about:blank window.
 */
function buildExternalHTML(): string {
    // Collect all active stylesheets to ensure the mirror looks identical to the master
    const styleSheets: string[] = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        styleSheets.push((link as HTMLLinkElement).outerHTML);
    });
    document.querySelectorAll('style').forEach((style) => {
        styleSheets.push(style.outerHTML);
    });

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl" class="${document.documentElement.className}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>External Display — Hos Eroaf</title>
    ${styleSheets.join('\n    ')}
    <style>
        /* External mirror: hide cursor, no scrollbars, no overflow */
        *, *::before, *::after {
            cursor: none !important;
        }
        html, body {
            margin: 0;
            padding: 0;
            overflow: hidden !important;
            height: 100vh;
            width: 100vw;
            background-color: var(--background);
            color: var(--foreground);
        }
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; -ms-overflow-style: none; }

        .mirror-root {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
        }
        .mirror-waiting {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            text-align: center;
        }
        .mirror-spinner {
            width: 4rem; height: 4rem;
            border: 4px solid var(--border);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body class="font-sans antialiased">
    <div id="mirror-root" class="mirror-root presentation-bg">
        <div class="mirror-waiting">
            <div class="mirror-spinner"></div>
            <p style="font-size:1.5rem;font-family:var(--font-serif);color:var(--muted-foreground)">
                Waiting for presentation to start...
            </p>
        </div>
    </div>

    <div class="slide-progress" style="position:fixed;bottom:0;left:0;right:0;height:3px;background:var(--border);z-index:50">
        <div id="mirror-progress" style="height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));width:0%;transition:width 0.4s cubic-bezier(0.16,1,0.3,1);border-radius:0 2px 2px 0"></div>
    </div>

    <script>
        // Listen for slide updates from the controller via BroadcastChannel
        const channel = new BroadcastChannel('${CHANNEL_NAME}');

        channel.postMessage({ type: 'PRES_WINDOW_READY' });

        channel.onmessage = function(event) {
            if (event.data.type === 'SLIDE_UPDATE') {
                renderSlide(event.data.payload);
            }
            if (event.data.type === 'CLOSE_ALL') {
                window.close();
            }
        };

        window.addEventListener('beforeunload', function() {
            channel.postMessage({ type: 'PRES_WINDOW_CLOSED' });
        });

        // Click to fullscreen
        document.addEventListener('click', function() {
            document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(function(){});
        }, { once: true });

        function escapeHTML(str) {
            if (!str) return '';
            var div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function renderSlide(state) {
            var root = document.getElementById('mirror-root');
            var progress = document.getElementById('mirror-progress');
            var slide = state.slide;
            var pct = ((state.slideIndex + 1) / state.totalSlides) * 100;
            progress.style.width = pct + '%';

            // Build the section header
            var html = '<div class="slide-viewport" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem">';
            html += '<div style="width:100%;max-width:80rem;margin:0 auto;display:flex;flex-direction:column;align-items:center" class="slide-enter">';

            // Section title with ornaments
            html += '<div class="slide-section-header mb-8" style="font-size:clamp(1.25rem,3vw,2rem)">';
            html += '<span class="ornament" aria-hidden="true"></span>';
            html += '<span>' + escapeHTML(slide.section_name) + '</span>';
            html += '<span class="ornament" aria-hidden="true"></span>';
            html += '</div>';

            // Intonation badge
            if (slide.intonation) {
                html += '<div class="intonation-badge mb-8" style="font-size:clamp(0.875rem,2vw,1.125rem)">';
                html += escapeHTML(slide.intonation);
                html += '</div>';
            }

            // Ornamental rule
            html += '<div class="ornamental-rule mb-10"><span class="ornament-diamond"></span></div>';

            // Content
            html += '<div class="slide-content-enter" style="width:100%;padding:0 2rem">';

            if (slide.has_coptic) {
                var arLines = slide.lines.filter(function(l){ return l.lang_type === 'arabic'; });
                var copLines = slide.lines.filter(function(l){ return l.lang_type === 'coptic_arabized'; });
                var maxLen = Math.max(arLines.length, copLines.length);

                html += '<div style="display:flex;flex-direction:column;width:100%;max-width:80rem;margin:0 auto;gap:2.5rem">';
                for (var i = 0; i < maxLen; i++) {
                    html += '<div style="display:flex;flex-direction:row;gap:2.5rem;align-items:stretch">';

                    // Arabic column
                    html += '<div style="flex:1;display:flex;align-items:center">';
                    if (arLines[i]) {
                        html += '<p class="text-justified" dir="rtl" style="font-family:var(--font-reading);font-size:clamp(1.5rem,4vw,3rem);line-height:2;font-weight:700;color:var(--foreground);width:100%;margin:0">';
                        html += escapeHTML(arLines[i].text);
                        html += '</p>';
                    }
                    html += '</div>';

                    // Divider
                    html += '<div class="column-divider" aria-hidden="true"></div>';

                    // Coptic column
                    html += '<div style="flex:1;display:flex;align-items:center">';
                    if (copLines[i]) {
                        html += '<p class="text-justified" dir="rtl" style="font-family:var(--font-reading);font-size:clamp(1.5rem,4vw,3rem);line-height:2;font-weight:700;color:var(--primary);opacity:0.9;width:100%;margin:0">';
                        html += escapeHTML(copLines[i].text);
                        html += '</p>';
                    }
                    html += '</div>';

                    html += '</div>';
                }
                html += '</div>';
            } else {
                html += '<div style="display:flex;flex-direction:column;gap:2rem;max-width:64rem;margin:0 auto;width:100%">';
                for (var j = 0; j < slide.lines.length; j++) {
                    html += '<p class="text-justified" dir="rtl" style="font-family:var(--font-reading);font-size:clamp(1.5rem,4vw,3rem);line-height:2;font-weight:700;color:var(--foreground);margin:0">';
                    html += escapeHTML(slide.lines[j].text);
                    html += '</p>';
                }
                html += '</div>';
            }

            html += '</div>'; // slide-content-enter
            html += '</div>'; // inner wrapper
            html += '</div>'; // slide-viewport

            root.innerHTML = html;
        }
    </script>
</body>
</html>`;
}

/**
 * useExternalPresentation Hook
 * 
 * A specialized hook for managing 'Zero-Route' external mirrors. 
 * It opens blank windows and populates them with a self-contained HTML renderer,
 * then synchronizes them via a dedicated BroadcastChannel.
 */
export function useExternalPresentation() {
    /** Communication channel for state updates */
    const channelRef = useRef<BroadcastChannel | null>(null);
    /** List of active mirror window instances */
    const windowsRef = useRef<Window[]>([]);
    /** Number of currently open external windows */
    const [externalCount, setExternalCount] = useState(0);
    /** Cache of the most recent state to sync new windows immediately */
    const latestStateRef = useRef<PresentationState | null>(null);

    useEffect(() => {
        if (typeof BroadcastChannel !== 'undefined') {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);

            channelRef.current.onmessage = (event) => {
                if (event.data.type === 'PRES_WINDOW_CLOSED') {
                    setExternalCount(prev => Math.max(0, prev - 1));
                }
                if (event.data.type === 'PRES_WINDOW_READY') {
                    setExternalCount(prev => prev + 1);
                    // Immediately send current slide to newly connected window
                    if (latestStateRef.current) {
                        channelRef.current?.postMessage({
                            type: 'SLIDE_UPDATE',
                            payload: latestStateRef.current,
                        });
                    }
                }
            };
        }

        return () => {
            channelRef.current?.close();
        };
    }, []);

    /** Broadcats a slide update to all open external windows */
    const broadcastSlide = useCallback((state: PresentationState) => {
        latestStateRef.current = state;
        channelRef.current?.postMessage({
            type: 'SLIDE_UPDATE',
            payload: state,
        });
    }, []);

    /** 
     * Opens a new external window on the secondary screen.
     * Uses 'about:blank' and direct document.write for zero-route deployment.
     */
    const openExternalWindow = useCallback(() => {
        const width = window.screen.availWidth;
        const height = window.screen.availHeight;

        const features = `width=${width},height=${height},top=0,left=${window.screen.width},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes`;

        // Open a blank window
        const newWindow = window.open(
            'about:blank',
            `hos-erof-pres-${Date.now()}`,
            features
        );

        if (newWindow) {
            windowsRef.current.push(newWindow);

            // Directly inject the HTML and script
            const html = buildExternalHTML();
            newWindow.document.open();
            newWindow.document.write(html);
            newWindow.document.close();

            // Monitor window closure to update count
            const checkClosed = setInterval(() => {
                if (newWindow.closed) {
                    clearInterval(checkClosed);
                    windowsRef.current = windowsRef.current.filter(w => w !== newWindow);
                    setExternalCount(prev => Math.max(0, prev - 1));
                }
            }, 1000);
        }

        return newWindow;
    }, []);

    const closeAllExternal = useCallback(() => {
        windowsRef.current.forEach(w => {
            if (!w.closed) w.close();
        });
        windowsRef.current = [];
        setExternalCount(0);
        channelRef.current?.postMessage({ type: 'CLOSE_ALL' });
    }, []);

    return {
        broadcastSlide,
        openExternalWindow,
        closeAllExternal,
        externalCount,
        hasExternalWindows: externalCount > 0,
    };
}
