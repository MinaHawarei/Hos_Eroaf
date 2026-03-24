import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { useSync } from '@/hooks/useSync';
import { SplitViewReader } from '@/components/SplitViewReader';

export default function MirrorComponent() {
    const { state } = useSync('receiver');
    const [interactivityEnabled, setInteractivityEnabled] = useState(true);

    useEffect(() => {
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

    const { currentSlide, activeAlternativeIndex, effectiveFontSize, readerPageIndex, slideId, timestamp } = state;
    
    // Resolve which alternative to render specifically forcing the received index
    let alternativeToRender = null;
    if (currentSlide.has_alternatives && currentSlide.alternatives) {
        alternativeToRender = currentSlide.alternatives[activeAlternativeIndex];
    }

    const displayLines = alternativeToRender ? alternativeToRender.lines : (currentSlide.lines || []);
    const displayHasCoptic = alternativeToRender ? alternativeToRender.has_coptic : (currentSlide.has_coptic || false);

    return (
        <div 
            className={`presentation-bg h-screen w-screen overflow-hidden select-none p-10 md:p-16 lg:p-20 ${interactivityEnabled ? '' : 'pointer-events-none'}`} 
            dir="rtl"
            style={{ 
                cursor: interactivityEnabled ? 'default' : 'none',
                '--pres-font-size': `${effectiveFontSize}px`,
                userSelect: 'none',
            } as React.CSSProperties}
        >
            <Head title="Mirror View — Presentation" />
            
            <main className="flex h-full flex-col items-center justify-center">
                 {/* Slide Header Context */}
                 <div className="flex w-full flex-shrink-0 flex-col items-center">
                    <div className="slide-section-header pres-section-header-scale mb-4 text-center">
                        <span className="ornament" aria-hidden="true" />
                        <span>{currentSlide.section_name}</span>
                        <span className="ornament" aria-hidden="true" />
                    </div>
                </div>

                <div className="flex w-full flex-1 flex-col justify-center overflow-hidden">
                    <SplitViewReader
                        key={`${slideId}-${activeAlternativeIndex}`}
                        initialPage={readerPageIndex ?? 0}
                        lines={displayLines}
                        hasCoptic={displayHasCoptic}
                        justified={true}
                        className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center"
                        fontSizePx={effectiveFontSize ?? 28}
                        maxContentHeight={typeof window !== 'undefined' ? window.innerHeight - 350 : 800}
                    />
                </div>
            </main>
        </div>
    );
}
