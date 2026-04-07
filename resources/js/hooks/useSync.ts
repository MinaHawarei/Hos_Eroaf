import { useEffect, useCallback, useState, useRef } from 'react';

const CHANNEL_NAME = 'presentation_sync';

export type DisplayMode = 'normal' | 'chroma';

/**
 * Global synchronization state that defines exactly what is being 
 * displayed on all presentation screens (Master, Mirror, Chroma).
 */
export interface SyncState {
    /** Unique ID of the current slide */
    slideId: string;
    /** The actual slide object data */
    currentSlide: any;
    /** If the slide has multiple versions (alternatives), which one is selected */
    activeAlternativeIndex: number;
    /** Index of the slide within its section or overall list */
    currentSlideIndex: number;
    /** Total number of slides in the current context */
    totalSlides: number;
    /** Current Coptic date (for header sync) */
    copticDate?: string;
    /** Liturgical season label (e.g., 'Great Lent') */
    seasonLabel?: string;
    /** Computed font size in pixels (synchronized across displays) */
    effectiveFontSize: number;
    /** CSS zoom scale for manual viewport overrides */
    zoomScale?: number;
    /** Which 'page' of a large split slide is currently visible */
    readerPageIndex: number;
    /** The target display mode: 'normal' (Mirror) or 'chroma' (Broadcast) */
    displayMode: DisplayMode;
    /** High-res timestamp to ensure state freshness and avoid race conditions */
    timestamp: number;
}

/**
 * useSync Hook
 * 
 * Manages real-time synchronization between the Master control window and multiple 
 * Mirror/Chroma windows using the standard BroadcastChannel API.
 * 
 * Supports:
 * - Source mode: The Master window that broadcasts state changes.
 * - Receiver mode: Mirror windows that listen for and apply the state.
 */
export function useSync(mode: 'source' | 'receiver' = 'source') {
    const [state, setState] = useState<SyncState | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const [mirrorCount, setMirrorCount] = useState(0);
    const lastPayloadRef = useRef<Omit<SyncState, 'timestamp'> | null>(null);

    useEffect(() => {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = channel;

        if (mode === 'receiver') {
            channel.onmessage = (event) => {
                if (event.data.type === 'SYNC_STATE') {
                    setState(event.data.payload);
                } else if (event.data.type === 'CLOSE_MIRRORS') {
                    window.close();
                }
            };
            // Notify source that mirror is ready to receive state
            channel.postMessage({ type: 'MIRROR_READY' });
        } else {
            // Source mode: listen for ready messages
            channel.onmessage = (event) => {
                if (event.data.type === 'MIRROR_READY') {
                    setMirrorCount(prev => prev + 1);
                    // Re-send last known state so the new mirror doesn't stay on the waiting screen
                    if (lastPayloadRef.current && channelRef.current) {
                        channelRef.current.postMessage({
                            type: 'SYNC_STATE',
                            payload: { ...lastPayloadRef.current, timestamp: Date.now() }
                        });
                    }
                } else if (event.data.type === 'MIRROR_CLOSED') {
                    setMirrorCount(prev => Math.max(0, prev - 1));
                }
            };
        }

        return () => {
            channel.close();
        };
    }, [mode]);

    /** Broadcasts the current state to all connected mirrors/receivers */
    const broadcast = useCallback((payload: Omit<SyncState, 'timestamp'>) => {
        if (mode === 'source' && channelRef.current) {
            lastPayloadRef.current = payload;
            channelRef.current.postMessage({ 
                type: 'SYNC_STATE', 
                payload: { ...payload, timestamp: Date.now() } 
            });
        }
    }, [mode]);

    /** Commands all open mirror windows to safely close themselves */
    const closeMirrors = useCallback(() => {
        if (mode === 'source' && channelRef.current) {
            channelRef.current.postMessage({ type: 'CLOSE_MIRRORS' });
        }
    }, [mode]);

    /** 
     * Opens a new Mirror window. 
     * Attempts to automatically detect and place the window on an external monitor
     * using the Window Management API (getScreenDetails).
     */
    const openMirrorWindow = useCallback(async () => {
        let left = window.screen.width;
        let top = 0;
        let width = window.screen.availWidth;
        let height = window.screen.availHeight;

        try {
            // Check for modern Window Management API support
            if ('getScreenDetails' in window) {
                const screenDetails = await (window as any).getScreenDetails();
                // Find a screen that is NOT the current screen (likely a projector/TV)
                const externalScreen = screenDetails.screens.find(
                    (s: any) => s !== screenDetails.currentScreen
                );
                if (externalScreen) {
                    left = externalScreen.availLeft;
                    top = externalScreen.availTop;
                    width = externalScreen.availWidth;
                    height = externalScreen.availHeight;
                }
            }
        } catch (e) {
            console.warn('Could not get screen details for multi-display placement:', e);
        }

        const features = `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes`;
        const mirrorUrl = (window as any).route ? (window as any).route('mirror') : '/presentation/mirror';
        return window.open(mirrorUrl, `hos-erof-mirror-${Date.now()}`, features);
    }, []);

    /** 
     * Opens a new Chroma Key window for broadcast software (like OBS).
     */
    const openChromaWindow = useCallback(async () => {
        let left = window.screen.width;
        let top = 0;
        let width = window.screen.availWidth;
        let height = window.screen.availHeight;

        try {
            if ('getScreenDetails' in window) {
                const screenDetails = await (window as any).getScreenDetails();
                const externalScreen = screenDetails.screens.find(
                    (s: any) => s !== screenDetails.currentScreen
                );
                if (externalScreen) {
                    left = externalScreen.availLeft;
                    top = externalScreen.availTop;
                    width = externalScreen.availWidth;
                    height = externalScreen.availHeight;
                }
            }
        } catch (e) {
            console.warn('Could not get screen details for chroma display placement:', e);
        }

        const features = `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes`;
        const chromaUrl = (window as any).route ? (window as any).route('croma') : '/presentation/croma';
        return window.open(chromaUrl, `hos-erof-chroma-${Date.now()}`, features);
    }, []);

    return { 
        state, 
        broadcast, 
        closeMirrors, 
        openMirrorWindow,
        openChromaWindow,
        mirrorCount,
        hasMirrors: mirrorCount > 0
    };
}
