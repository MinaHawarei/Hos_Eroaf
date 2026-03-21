import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { usePresentationNavigation } from '@/hooks/usePresentationNavigation';
import { SplitViewReader } from '@/components/SplitViewReader';
import { PresentationSidebar } from '@/components/PresentationSidebar';
import { SearchOverlay } from '@/components/SearchOverlay';
import { Button } from '@/components/ui/button';
import { Search, Maximize, Minimize, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

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

    const { isFullscreen, toggleFullscreen, nextSlide, prevSlide } = usePresentationNavigation(
        slides,
        currentSlideIndex,
        setCurrentSlideIndex
    );

    // Keyboard shortcuts for search
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            if (e.key === 'f') {
                // optionally map 'f' to toggle fullscreen if not typing
                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    e.preventDefault();
                    toggleFullscreen();
                }
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [toggleFullscreen]);

    if (!slides || slides.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 text-white p-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">لا توجد قراءات مسجلة لهذا اليوم</h1>
                    <Button onClick={() => router.visit('/')}>العودة للرئيسية</Button>
                </div>
            </div>
        );
    }

    const currentSlide = slides[currentSlideIndex];

    const jumpToSection = (code: string) => {
        const idx = slides.findIndex(s => s.section_code === code);
        if (idx !== -1) {
            setCurrentSlideIndex(idx);
            setSidebarOpen(false); // auto close on jump
        }
    };

    const handleSearchResultClick = (item: any) => {
        setSearchOpen(false);
        // Find the slide containing this reading_id
        const idx = slides.findIndex(s => s.id === `slide-${item.section_code}-${item.reading_id}`);
        if (idx !== -1) {
            setCurrentSlideIndex(idx);
        }
    };

    return (
        <div className="relative min-h-screen bg-black text-white overflow-hidden selection:bg-primary/30 flex flex-col font-sans" dir="rtl">
            <Head title={`عرض - ${copticDate}`} />

            {/* Top Toolbar (Hidden automatically when inactive in future iterations, or minimal) */}
            <div className={`fixed top-0 left-0 right-15 z-30 p-4 transition-opacity duration-300 flex items-center justify-between ${isFullscreen ? 'opacity-0 hover:opacity-100' : ''}`}>
                <div className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 shadow-xl">
                    <Button variant="ghost" size="sm" className="h-8 md:h-9 hover:bg-zinc-800 text-zinc-300" onClick={() => router.visit('/')}>
                        الخروج
                    </Button>
                    <div className="w-px h-4 bg-zinc-700 mx-2" />

                    <span className="text-sm md:text-base font-bold text-amber-500 hidden sm:inline-block">
                        {copticDate} - {seasonLabel}
                    </span>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-2 py-1.5 rounded-full border border-zinc-800 shadow-xl">
                    <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} title="بحث (Ctrl+K)" className="h-9 w-9 text-zinc-300 hover:text-white hover:bg-zinc-800">
                        <Search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="ملء الشاشة (F)" className="h-9 w-9 text-zinc-300 hover:text-white hover:bg-zinc-800">
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            <PresentationSidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                sections={sections}
                currentSlideCode={currentSlide.section_code}
                onJumpToSection={jumpToSection}
            />

            <SearchOverlay
                open={searchOpen}
                onOpenChange={setSearchOpen}
                onResultClick={handleSearchResultClick}
            />

            {/* Main Presentation Area */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-16 relative overflow-y-auto no-scrollbar">

                <div className="w-full max-w-7xl mx-auto flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="mb-12 text-center text-amber-500/80 text-lg md:text-2xl font-serif tracking-widest border-b border-amber-500/20 pb-4 inline-block">
                        {currentSlide.section_name}
                    </div>
                    <div className="mb-12 text-center text-amber-500/80 text-lg md:text-2xl font-serif tracking-widest border-b border-amber-500/20 pb-4 inline-block">
                        {currentSlide.intonation_ar}
                    </div>

                    <SplitViewReader
                        lines={currentSlide.lines}
                        hasCoptic={currentSlide.has_coptic}
                        className="animate-in slide-in-from-bottom flex flex-col w-full"
                    />
                </div>

            </main>

            {/* Bottom Controls */}
           <div className={`fixed bottom-0 left-0 right-0 z-30 p-8 flex items-center justify-end pointer-events-none ${isFullscreen ? 'opacity-0 hover:opacity-100 transition-opacity duration-300' : ''}`}>

                <div className="flex flex-row-reverse gap-4 pointer-events-auto bg-black/50 backdrop-blur-md rounded-full border border-white/10 p-2">

                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-12 w-12 rounded-full hover:bg-white/10 disabled:opacity-30 text-white"
                        onClick={prevSlide}
                        disabled={currentSlideIndex === 0}
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </Button>

                    <span className="flex items-center px-4 font-mono text-xl text-zinc-500">
                        {slides.length} / {currentSlideIndex + 1}
                    </span>

                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-12 w-12 rounded-full hover:bg-white/10 disabled:opacity-30 text-white"
                        onClick={nextSlide}
                        disabled={currentSlideIndex === slides.length - 1}
                    >
                        <ChevronRight className="h-8 w-8" />
                    </Button>
                </div>
            </div>

        </div>
    );
}
