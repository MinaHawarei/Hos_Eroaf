import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { useSync } from '@/hooks/useSync';
import { SplitViewReader } from '@/components/SplitViewReader';

export default function MirrorComponent() {
    const { state } = useSync('receiver');
    const [interactivityEnabled, setInteractivityEnabled] = useState(true);

    useEffect(() => {
        // Passive Receiver mode: We strictly listen and don't emit state-syncing actions
        // (BroadcastChannel in receiver mode doesn't broadcast 'SYNC_STATE')
        
        const enterFullscreen = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
            setInteractivityEnabled(false);
        };
        
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

    if (!state || !state.currentSlide) {
        return (
            <div 
                className="presentation-bg flex h-screen w-screen items-center justify-center overflow-hidden" 
                style={{ cursor: interactivityEnabled ? 'default' : 'none' }}
            >
                <Head title="Mirror Mode — Presentation" />
                <div className="flex flex-col items-center gap-8 text-center p-6">
                    <div className="relative">
                        <div className="h-20 w-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                    <div className="space-y-4">
                        <p className="text-muted-foreground font-serif text-lg animate-pulse" dir="rtl">
                            {interactivityEnabled 
                                ? 'اضغط في أي مكان لتفعيل ملء الشاشة والبدء...' 
                                : 'في انتظار بدء العرض من الشاشة الرئيسية...'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const { currentSlide, effectiveFontSize, readerPageIndex } = state;

    return (
        <div 
            className={`presentation-bg h-screen w-screen overflow-hidden ${interactivityEnabled ? '' : 'pointer-events-none'}`} 
            dir="rtl"
            style={{ 
                cursor: interactivityEnabled ? 'default' : 'none',
                '--pres-font-size': `${effectiveFontSize}px`,
                userSelect: 'none',
            } as React.CSSProperties}
        >
            <Head title="Mirror View — Presentation" />
            
            <main className="flex h-full flex-col items-center justify-center p-8 md:p-12 lg:p-16">
                 <div className="flex w-full flex-shrink-0 flex-col items-center">
                    <div className="slide-section-header pres-section-header-scale mb-4 text-center">
                        <span className="ornament" aria-hidden="true" />
                        <span>{currentSlide.section_name}</span>
                        <span className="ornament" aria-hidden="true" />
                    </div>
                    {currentSlide.intonation_ar && (
                        <div className="intonation-badge pres-intonation-scale mb-4 text-center">
                            {currentSlide.intonation_ar}
                        </div>
                    )}
                    <div className="ornamental-rule mb-8">
                        <span className="ornament-diamond" />
                    </div>
                </div>

                <div className="flex w-full flex-1 flex-col justify-center overflow-hidden">
                    <SplitViewReader
                        key={currentSlide.id}
                        initialPage={readerPageIndex ?? 0}
                        lines={currentSlide.lines || []}
                        hasCoptic={currentSlide.has_coptic || false}
                        justified={true}
                        className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center"
                        fontSizePx={effectiveFontSize ?? 28}
                        maxContentHeight={typeof window !== 'undefined' ? window.innerHeight - 250 : 800}
                    />
                </div>
            </main>
        </div>
    );
}
