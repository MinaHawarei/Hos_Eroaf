import { useEffect, useRef, useCallback, useState } from 'react';

const CHANNEL_NAME = 'hos-erof-presentation';

interface PresentationState {
    slideIndex: number;
    slide: any;
    copticDate: string;
    seasonLabel: string;
    totalSlides: number;
}

/**
 * Hook that manages external presentation window(s).
 * Uses BroadcastChannel to synchronize slide state
 * across multiple windows/displays.
 */
export function useExternalPresentation() {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const windowsRef = useRef<Window[]>([]);
    const [externalCount, setExternalCount] = useState(0);

    // Initialize BroadcastChannel
    useEffect(() => {
        if (typeof BroadcastChannel !== 'undefined') {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);

            channelRef.current.onmessage = (event) => {
                if (event.data.type === 'PRES_WINDOW_CLOSED') {
                    setExternalCount(prev => Math.max(0, prev - 1));
                }
                if (event.data.type === 'PRES_WINDOW_READY') {
                    setExternalCount(prev => prev + 1);
                }
            };
        }

        return () => {
            channelRef.current?.close();
        };
    }, []);

    // Broadcast slide update to all external windows
    const broadcastSlide = useCallback((state: PresentationState) => {
        channelRef.current?.postMessage({
            type: 'SLIDE_UPDATE',
            payload: state,
        });
    }, []);

    // Open a new external presentation window
    const openExternalWindow = useCallback(() => {
        const width = window.screen.availWidth;
        const height = window.screen.availHeight;

        // Try to open on a secondary display if available
        const features = `width=${width},height=${height},top=0,left=${window.screen.width},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes`;

        const newWindow = window.open(
            `${window.location.origin}/presentation/external`,
            `hos-erof-pres-${Date.now()}`,
            features
        );

        if (newWindow) {
            windowsRef.current.push(newWindow);

            // Try full screen on the new window
            const tryFullscreen = () => {
                try {
                    newWindow.document.documentElement.requestFullscreen?.();
                } catch {
                    // silently fail — user may need to manually fullscreen
                }
            };

            newWindow.addEventListener('load', () => {
                setTimeout(tryFullscreen, 500);
            });

            // Clean up on close
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

    // Close all external windows
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

/**
 * Hook for the RECEIVING side (external presentation window).
 * Listens for slide updates from the controller window.
 */
export function useExternalPresentationReceiver() {
    const [state, setState] = useState<PresentationState | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;

        channelRef.current = new BroadcastChannel(CHANNEL_NAME);

        // Notify controller that this window is ready
        channelRef.current.postMessage({ type: 'PRES_WINDOW_READY' });

        channelRef.current.onmessage = (event) => {
            if (event.data.type === 'SLIDE_UPDATE') {
                setState(event.data.payload);
            }
            if (event.data.type === 'CLOSE_ALL') {
                window.close();
            }
        };

        // Notify on close
        const handleBeforeUnload = () => {
            channelRef.current?.postMessage({ type: 'PRES_WINDOW_CLOSED' });
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            channelRef.current?.close();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    return state;
}
