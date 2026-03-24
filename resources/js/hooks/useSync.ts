import { useEffect, useCallback, useState, useRef } from 'react';

const CHANNEL_NAME = 'presentation_sync';

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

    const openMirrorWindow = useCallback(() => {
        const width = window.screen.availWidth;
        const height = window.screen.availHeight;
        const features = `width=${width},height=${height},top=0,left=${window.screen.width},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes`;

        const mirrorUrl = (window as any).route ? (window as any).route('mirror') : '/presentation/mirror';

        return window.open(mirrorUrl, `hos-erof-mirror-${Date.now()}`, features);
    }, []);

    return { 
        state, 
        broadcast, 
        closeMirrors, 
        openMirrorWindow,
        mirrorCount,
        hasMirrors: mirrorCount > 0
    };
}
