import { useEffect, useCallback, useState, useRef } from 'react';

const CHANNEL_NAME = 'presentation_sync';

export type DisplayMode = 'normal' | 'chroma';

export interface SyncState {
    slideId: string;
    currentSlide: any;
    activeAlternativeIndex: number;
    currentSlideIndex: number;
    totalSlides: number;
    copticDate?: string;
    seasonLabel?: string;
    effectiveFontSize: number;
    zoomScale?: number;
    readerPageIndex: number;
    displayMode: DisplayMode;
    timestamp: number;
}

export function useSync(mode: 'source' | 'receiver' = 'source') {
    const [state, setState] = useState<SyncState | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const [mirrorCount, setMirrorCount] = useState(0);

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
                } else if (event.data.type === 'MIRROR_CLOSED') {
                    setMirrorCount(prev => Math.max(0, prev - 1));
                }
            };
        }

        return () => {
            channel.close();
        };
    }, [mode]);

    const broadcast = useCallback((payload: Omit<SyncState, 'timestamp'>) => {
        if (mode === 'source' && channelRef.current) {
            channelRef.current.postMessage({ 
                type: 'SYNC_STATE', 
                payload: { ...payload, timestamp: Date.now() } 
            });
        }
    }, [mode]);

    const closeMirrors = useCallback(() => {
        if (mode === 'source' && channelRef.current) {
            channelRef.current.postMessage({ type: 'CLOSE_MIRRORS' });
        }
    }, [mode]);

    const openMirrorWindow = useCallback(async () => {
        let left = window.screen.width;
        let top = 0;
        let width = window.screen.availWidth;
        let height = window.screen.availHeight;

        try {
            if ('getScreenDetails' in window) {
                const screenDetails = await (window as any).getScreenDetails();
                // Find a screen that is NOT the current screen
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
