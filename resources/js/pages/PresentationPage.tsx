import React, { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { usePresentationNavigation } from '@/hooks/usePresentationNavigation';
import { useExternalPresentation } from '@/hooks/useExternalPresentation';
import { SplitViewReader } from '@/components/SplitViewReader';
import { PresentationSidebar } from '@/components/PresentationSidebar';
import { SearchOverlay } from '@/components/SearchOverlay';
import { Button } from '@/components/ui/button';
import {
    Search,
    Maximize,
    Minimize,
    ChevronLeft,
    ChevronRight,
    Monitor,
    MonitorX,
    LogOut,
    BookOpen,
} from 'lucide-react';

interface Slide {
    id: string;
    section_code: string;
    section_name: string;
    intonation_ar: string;
    title: string;
    lines: any[];
    has_coptic: boolean;
}

interface PresentationPageProps {
    dayKey: string;
    copticDate: string;
    seasonLabel: string;
    sections: any[];
    slides: Slide[];
}

export default function PresentationPage({ copticDate, seasonLabel, sections, slides }: PresentationPageProps) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [slideKey, setSlideKey] = useState(0);

    const { isFullscreen, toggleFullscreen, nextSlide, prevSlide } = usePresentationNavigation(
        slides,
        currentSlideIndex,
        setCurrentSlideIndex
    );

    const {
        broadcastSlide,
        openExternalWindow,
        closeAllExternal,
        externalCount,
        hasExternalWindows,
    } = useExternalPresentation();

    const currentSlide = slides?.[currentSlideIndex];

    // Broadcast slide changes to external windows
    useEffect(() => {
        if (currentSlide) {
            broadcastSlide({
                slideIndex: currentSlideIndex,
                slide: currentSlide,
                copticDate,
                seasonLabel,
                totalSlides: slides.length,
            });
        }
    }, [currentSlideIndex, currentSlide, copticDate, seasonLabel, slides.length, broadcastSlide]);

    // Trigger re-mount animation on slide change
    useEffect(() => {
        setSlideKey(prev => prev + 1);
    }, [currentSlideIndex]);

    // Keyboard shortcuts
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            if (e.key === 'f' && (e.target as HTMLElement).tagName !== 'INPUT') {
                e.preventDefault();
                toggleFullscreen();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [toggleFullscreen]);

    // Empty state
    if (!slides || slides.length === 0) {
        return (
            <div className="presentation-bg flex h-screen items-center justify-center p-8" dir="rtl">
                <Head title="لا توجد قراءات" />
                <div className="text-center heritage-surface rounded-2xl p-12 max-w-md">
                    <BookOpen className="h-16 w-16 text-primary/30 mx-auto mb-6" />
                    <h1 className="text-2xl font-serif font-bold mb-4 text-foreground">
                        لا توجد قراءات مسجلة لهذا اليوم
                    </h1>
                    <p className="text-muted-foreground mb-8">
                        لم يتم العثور على شرائح عرض لهذا التاريخ
                    </p>
                    <Button
                        onClick={() => router.visit('/')}
                        className="rounded-full px-8"
                    >
                        العودة للرئيسية
                    </Button>
                </div>
            </div>
        );
    }

    const jumpToSection = (code: string) => {
        const idx = slides.findIndex(s => s.section_code === code);
        if (idx !== -1) {
            setCurrentSlideIndex(idx);
            setSidebarOpen(false);
        }
    };

    const handleSearchResultClick = (item: any) => {
        setSearchOpen(false);
        const idx = slides.findIndex(s => s.id === `slide-${item.section_code}-${item.reading_id}`);
        if (idx !== -1) {
            setCurrentSlideIndex(idx);
        }
    };

    const progressPercent = ((currentSlideIndex + 1) / slides.length) * 100;

    return (
        <div className="presentation-bg relative min-h-screen overflow-hidden selection:bg-primary/30 flex flex-col font-sans" dir="rtl">
            <Head title={`عرض - ${copticDate}`} />

            {/* ═══════ Top Toolbar ═══════ */}
            <div className={`fixed top-0 left-0 right-15 z-30 p-3 md:p-4 transition-all duration-500 ${isFullscreen ? 'opacity-0 hover:opacity-100' : ''}`}>
                <div className="max-w-screen-xl mx-auto flex items-center justify-between">

                    {/* Left group: Exit + info */}
                    <div className="flex items-center gap-3 pres-toolbar px-4 py-2 rounded-full">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => router.visit('/')}
                        >
                            <LogOut className="h-4 w-4 rtl-flip" />
                            <span className="hidden sm:inline">الخروج</span>
                        </Button>

                        <div className="w-px h-4 bg-border" />

                        <span className="text-sm md:text-base font-bold text-primary hidden sm:inline-block">
                            {copticDate}
                        </span>
                        <span className="text-xs text-muted-foreground hidden md:inline-block">
                            {seasonLabel}
                        </span>
                    </div>

                    {/* Right group: Actions */}
                    <div className="flex items-center gap-1.5 pres-toolbar px-2 py-1.5 rounded-full">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSearchOpen(true)}
                            title="بحث (Ctrl+K)"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                            <Search className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={hasExternalWindows ? closeAllExternal : openExternalWindow}
                            title={hasExternalWindows ? 'إغلاق الشاشات الخارجية' : 'عرض على شاشة خارجية'}
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                        >
                            {hasExternalWindows ? (
                                <MonitorX className="h-4 w-4" />
                            ) : (
                                <Monitor className="h-4 w-4" />
                            )}
                            {externalCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full font-bold">
                                    {externalCount}
                                </span>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            title="ملء الشاشة (F)"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ═══════ Sidebar ═══════ */}
            <PresentationSidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                sections={sections}
                currentSlideCode={currentSlide.section_code}
                onJumpToSection={jumpToSection}
            />

            {/* ═══════ Search ═══════ */}
            <SearchOverlay
                open={searchOpen}
                onOpenChange={setSearchOpen}
                onResultClick={handleSearchResultClick}
            />

            {/* ═══════ Main Slide Area ═══════ */}
            <main className="flex-1 flex flex-col items-center justify-center overflow-y-auto no-scrollbar">
                <div className="slide-viewport" key={slideKey}>
                    <div className="w-full max-w-7xl mx-auto flex flex-col items-center slide-enter">

                        {/* ─── Section Header with Coptic Ornaments ─── */}
                        <div className="slide-section-header mb-6 text-lg md:text-2xl lg:text-3xl">
                            <span className="ornament" aria-hidden="true" />
                            <span>{currentSlide.section_name}</span>
                            <span className="ornament" aria-hidden="true" />
                        </div>

                        {/* ─── Intonation Badge ─── */}
                        {currentSlide.intonation_ar && (
                            <div className="mb-6 intonation-badge text-sm md:text-base">
                                {currentSlide.intonation_ar}
                            </div>
                        )}

                        {/* ─── Ornamental Divider ─── */}
                        <div className="ornamental-rule mb-8 md:mb-12">
                            <span className="ornament-diamond" />
                        </div>

                        {/* ─── Slide Content ─── */}
                        <div className="slide-content-enter w-full px-2 md:px-6 lg:px-12">
                            <SplitViewReader
                                lines={currentSlide.lines}
                                hasCoptic={currentSlide.has_coptic}
                                justified={true}
                                className="flex flex-col w-full"
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* ═══════ Bottom Controls ═══════ */}
            <div className={`fixed bottom-4 left-0 right-0 z-30 flex items-center justify-center pointer-events-none transition-all duration-500 ${isFullscreen ? 'opacity-0 hover:opacity-100' : ''}`}>
                <div className="flex items-center gap-3 pointer-events-auto pres-nav-controls rounded-full px-4 py-2">
                    {/* Previous (Right in RTL) */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-muted disabled:opacity-30 text-foreground"
                        onClick={prevSlide}
                        disabled={currentSlideIndex === 0}
                        aria-label="الشريحة السابقة"
                    >
                        <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
                    </Button>

                    {/* Slide counter */}
                    <span className="flex items-center px-3 md:px-4 font-mono text-base md:text-lg text-muted-foreground select-none whitespace-nowrap">
                        <span className="text-foreground font-bold">{currentSlideIndex + 1}</span>
                        <span className="mx-1.5 text-border">/</span>
                        <span>{slides.length}</span>
                    </span>

                    {/* Next (Left in RTL) */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-muted disabled:opacity-30 text-foreground"
                        onClick={nextSlide}
                        disabled={currentSlideIndex === slides.length - 1}
                        aria-label="الشريحة التالية"
                    >
                        <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
                    </Button>
                </div>
            </div>

            {/* ═══════ Progress Bar ═══════ */}
            <div className="slide-progress">
                <div
                    className="slide-progress-bar"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
