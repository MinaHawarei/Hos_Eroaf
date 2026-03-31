import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { usePresentationNavigation } from '@/hooks/usePresentationNavigation';
import { useSync } from '@/hooks/useSync';
import { SplitViewReader, SplitViewReaderRef } from '@/components/SplitViewReader';
import { PresentationSidebar } from '@/components/PresentationSidebar';
import { SearchOverlay } from '@/components/SearchOverlay';
import { Button } from '@/components/ui/button';
import { splitLargeSlides, SplitResult } from '@/utils/splitLargeSlides';
import { TextPaginator } from '@/utils/TextPaginator';
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
    Plus,
    Minus,
    RotateCcw,
    Loader2,
    Tv,
    TvMinimalPlay
} from 'lucide-react';
import Cookies from 'js-cookie';

import { LiturgySection, SlideAlternativeItem, SlideAlternativeSection } from '@/types';
import { AlternativeSwitcher } from '@/components/Liturgy/AlternativeSwitcher';

interface Slide {
    id: string;
    section_code: string;
    section_name: string;
    intonation?: string | null;
    conclusion?: string | null;
    title?: string;
    lines?: any[];
    has_coptic?: boolean;
    has_alternatives?: boolean;
    active_index?: number;
    alternatives?: SlideAlternativeItem[];
}

interface PresentationPageProps {
    dayKey: string;
    copticDate: string;
    seasonLabel: string;
    sections: LiturgySection[];
    slides: Slide[];
    defaultBaseFontSize?: number;
}

const ZOOM_STORAGE_KEY = 'pres_zoom_scale';
const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

// الـ padding الثابت للـ main container (pt-4 pb-5 = 16px + 20px = 36px)
// + مسافة إضافية للأمان تمنع أي اقتطاع
const MAIN_PADDING_PX = 36 + 8;

// ارتفاع شريط التنقل السفلي (h-24 = 96px)
const NAV_BAR_HEIGHT_PX = 96;

function readStoredZoom(): number {
    if (typeof window === 'undefined') {
        return 1;
    }
    const raw = sessionStorage.getItem(ZOOM_STORAGE_KEY);
    const n = raw ? Number.parseFloat(raw) : 1;
    if (!Number.isFinite(n)) {
        return 1;
    }
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
}

export default function PresentationPage({
    copticDate,
    seasonLabel,
    sections,
    slides: slidesProp,
    defaultBaseFontSize = 28,
}: PresentationPageProps) {
    const [deck, setDeck] = useState<Slide[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [highlightQuery, setHighlightQuery] = useState<string | undefined>(undefined);
    const [isSplitting, setIsSplitting] = useState(true);
    const [splitInfo, setSplitInfo] = useState<SplitResult | null>(null);
    const [altPreferences, setAltPreferences] = useState<Record<string, number>>({});

    const [baseFontSize] = useState(() => {
        const fromCookie = Number(Cookies.get('baseFontSize'));
        if (Number.isFinite(fromCookie) && fromCookie > 0) {
            return fromCookie;
        }
        return defaultBaseFontSize;
    });

    const [zoomScale, setZoomScale] = useState(readStoredZoom);

    // Presentation mode (affects slide segmentation height)
    const [presentationMode, setPresentationMode] = useState<'normal' | 'chroma'>('normal');

    // Track current slide ID for index restoration after deck rebuild
    const currentSlideIdRef = useRef<string | null>(null);

    const readerRef = React.useRef<SplitViewReaderRef>(null);
    const readerSlotRef = useRef<HTMLDivElement>(null);

    // ref لقياس ارتفاع الـ header (section name + intonation + ornament)
    const slideHeaderRef = useRef<HTMLDivElement>(null);
    const [slideHeaderHeight, setSlideHeaderHeight] = useState(0);

    const mainRef = useRef<HTMLElement>(null);
    const [readerSlotHeight, setReaderSlotHeight] = useState(400);
    const [readerNav, setReaderNav] = useState({
        isFirstPage: true,
        isLastPage: true,
        pageIndex: 0,
        pageCount: 1,
    });

    const effectiveFontSize = Math.round(baseFontSize * zoomScale);

    // الارتفاع الفعلي المتاح للـ SplitViewReader بعد خصم كل العناصر الثابتة
    // readerSlotHeight = الارتفاع الحقيقي للـ div الحاوي (يشمل header + content)
    // نخصم منه: ارتفاع الـ header الفعلي + padding الـ main + شريط التنقل
    const effectiveReaderHeight = Math.max(
        200,
        readerSlotHeight - slideHeaderHeight - MAIN_PADDING_PX - NAV_BAR_HEIGHT_PX
    );

    // قياس ارتفاع الـ header عند كل تغيير في الشريحة
    useLayoutEffect(() => {
        const el = slideHeaderRef.current;
        if (!el) return;

        const measure = () => {
            const h = el.getBoundingClientRect().height;
            if (h > 0) setSlideHeaderHeight(Math.ceil(h));
        };

        measure();

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(measure);
            ro.observe(el);
            return () => ro.disconnect();
        }
    }, [deck, currentSlideIndex]);

    const processAndSplitSlides = useCallback(async () => {
        if (!slidesProp || slidesProp.length === 0) {
            setDeck([]);
            setIsSplitting(false);
            return;
        }

        setIsSplitting(true);

        try {
            const containerWidth = typeof window !== 'undefined'
                ? Math.max(280, window.innerWidth - 64)
                : 960;

            const paginator = new TextPaginator(
                'slide-content-enter',
                effectiveFontSize,
                containerWidth
            );
            paginator.setContentWidth(containerWidth);

            const measureAdapter = {
                arabicParagraph: (t: string) => paginator.measureArabicParagraphHeight(t),
                dualRow: (ar: string, copAr: string) => paginator.measureDualColumnRowHeight(ar, copAr),
                tripleRow: (ar: string, copAr: string, cop: string) =>
                    paginator.measureTripleColumnRowHeight(ar, copAr, cop),
            };

            // Calculate segment height based on presentation mode
            let availableHeight = Math.max(300, effectiveReaderHeight);
            if (presentationMode === 'chroma') {
                // Ensure text stays contained in the lower portion of the screen
                const chromaConstraint = typeof window !== 'undefined'
                    ? Math.max(250, window.innerHeight * 0.40)
                    : 350;
                availableHeight = Math.min(availableHeight, chromaConstraint);
            }

            const result = await splitLargeSlides(
                slidesProp,
                availableHeight,
                effectiveFontSize,
                containerWidth,
                measureAdapter
            );

            setDeck(result.slides);
            setSplitInfo(result);
            paginator.cleanup();

            if (result.totalSplitSlides > result.totalOriginalSlides) {
                console.log(
                    `تم تقسيم الشرائح: ${result.totalOriginalSlides} → ${result.totalSplitSlides} شريحة ` +
                    `(+${result.totalSplitSlides - result.totalOriginalSlides} شريحة جديدة)`
                );
            }
        } catch (error) {
            console.error('خطأ في تقسيم الشرائح:', error);
            setDeck(slidesProp);
        } finally {
            setIsSplitting(false);
        }
    }, [slidesProp, effectiveFontSize, effectiveReaderHeight, presentationMode]);

    useEffect(() => {
        processAndSplitSlides();
    }, [processAndSplitSlides]);

    // Restore slide index after deck rebuild (fixes zoom reset bug)
    useEffect(() => {
        if (!deck || deck.length === 0) return;
        const savedId = currentSlideIdRef.current;
        if (!savedId) {
            // First load — start at 0
            setCurrentSlideIndex(0);
            currentSlideIdRef.current = deck[0]?.id ?? null;
            return;
        }
        // Try to find the same slide (or closest match by section_code prefix)
        const exactIdx = deck.findIndex(s => s.id === savedId);
        if (exactIdx !== -1) {
            setCurrentSlideIndex(exactIdx);
            return;
        }
        // Fallback: find slide with same section_code prefix
        const prefix = savedId.split('-').slice(0, 2).join('-');
        const prefixIdx = deck.findIndex(s => s.id.startsWith(prefix));
        if (prefixIdx !== -1) {
            setCurrentSlideIndex(prev => Math.min(prev, deck.length - 1));
            return;
        }
        // Last resort: clamp to valid range
        setCurrentSlideIndex(prev => Math.min(prev, deck.length - 1));
    }, [deck]);

    useEffect(() => {
        sessionStorage.setItem(ZOOM_STORAGE_KEY, String(zoomScale));
    }, [zoomScale]);

    useLayoutEffect(() => {
        const el = readerSlotRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            return;
        }
        const ro = new ResizeObserver((entries) => {
            const h = entries[0]?.contentRect.height;
            if (h && h > 0) {
                setReaderSlotHeight(Math.floor(h));
            }
        });
        ro.observe(el);
        setReaderSlotHeight(Math.floor(el.getBoundingClientRect().height) || 400);
        return () => ro.disconnect();
    }, []);

    const resetScrollPositions = useCallback(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
            mainRef.current.scrollLeft = 0;
        }
    }, []);

    useLayoutEffect(() => {
        resetScrollPositions();
    }, [currentSlideIndex, deck, resetScrollPositions]);

    const handleNextSlide = useCallback(() => {
        if (readerRef.current?.nextPage()) {
            return;
        }
        setCurrentSlideIndex((prev) => {
            if (prev < deck.length - 1) {
                return prev + 1;
            }
            return prev;
        });
    }, [deck.length]);

    const handlePrevSlide = useCallback(() => {
        if (readerRef.current?.prevPage()) {
            return;
        }
        setCurrentSlideIndex((prev) => {
            if (prev > 0) {
                return prev - 1;
            }
            return prev;
        });
    }, []);

    const { isFullscreen, toggleFullscreen } = usePresentationNavigation(
        deck,
        currentSlideIndex,
        setCurrentSlideIndex,
        handleNextSlide,
        handlePrevSlide
    );

    const { broadcast, openMirrorWindow, openChromaWindow, closeMirrors, mirrorCount, hasMirrors } =
        useSync('source');

    const currentSlide = deck?.[currentSlideIndex];

    // Keep the ref in sync with current slide
    useEffect(() => {
        if (currentSlide?.id) {
            currentSlideIdRef.current = currentSlide.id;
        }
    }, [currentSlide?.id]);

    useEffect(() => {
        setHighlightQuery(undefined);
        setReaderNav({ isFirstPage: true, isLastPage: true, pageIndex: 0, pageCount: 1 });
    }, [currentSlideIndex]);

    useEffect(() => {
        if (currentSlide) {
            const signature = currentSlide.alternatives?.map((a: any) => a.label).join('|') || '';
            const activeAlternativeIndex = altPreferences[signature] ?? currentSlide.active_index ?? 0;

            broadcast({
                slideId: currentSlide.id,
                currentSlide: currentSlide,
                activeAlternativeIndex: activeAlternativeIndex,
                currentSlideIndex: currentSlideIndex,
                totalSlides: deck.length,
                copticDate,
                seasonLabel,
                effectiveFontSize,
                readerPageIndex: readerNav.pageIndex,
                displayMode: presentationMode,
            });
        }
    }, [currentSlideIndex, currentSlide, copticDate, seasonLabel, deck.length, effectiveFontSize, readerNav.pageIndex, broadcast, altPreferences, presentationMode]);

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

    if (isSplitting) {
        return (
            <div className="presentation-bg flex h-screen items-center justify-center p-8" dir="rtl">
                <Head title="جاري التحميل..." />
                <div className="text-center heritage-surface rounded-2xl p-12 max-w-md">
                    <Loader2 className="h-16 w-16 text-primary/30 mx-auto mb-6 animate-spin" />
                    <h1 className="text-2xl pres-arabic-text font-bold mb-4 text-foreground">جاري تجهيز العرض</h1>
                    <p className="text-muted-foreground">يتم تقسيم الشرائح الكبيرة لتحسين العرض...</p>
                </div>
            </div>
        );
    }

    if (!deck || deck.length === 0) {
        return (
            <div className="presentation-bg flex h-screen items-center justify-center p-8" dir="rtl">
                <Head title="لا توجد قراءات" />
                <div className="text-center heritage-surface rounded-2xl p-12 max-w-md">
                    <BookOpen className="h-16 w-16 text-primary/30 mx-auto mb-6" />
                    <h1 className="text-2xl pres-arabic-text font-bold mb-4 text-foreground">لا توجد قراءات مسجلة لهذا اليوم</h1>
                    <p className="text-muted-foreground mb-8">لم يتم العثور على شرائح عرض لهذا التاريخ</p>
                    <Button onClick={() => router.visit('/')} className="rounded-full px-8">
                        العودة للرئيسية
                    </Button>
                </div>
            </div>
        );
    }

    const jumpToSection = (code: string) => {
        const idx = deck.findIndex((s) => s.section_code === code);
        if (idx !== -1) {
            setCurrentSlideIndex(idx);
            setSidebarOpen(false);
        }
    };

    const handleLocalSearchResult = (slideId: string, q: string) => {
        const idx = deck.findIndex((s) => s.id === slideId);
        if (idx !== -1) {
            setHighlightQuery(q);
            setCurrentSlideIndex(idx);
        }
    };

    const handleGlobalInsert = (slide: Record<string, unknown>, q: string) => {
        const s = slide as unknown as Slide;
        const inserted: Slide = {
            ...s,
            id: `${s.id}-ins-${Date.now()}`,
        };
        setDeck((d) => {
            const next = [...d];
            next.splice(currentSlideIndex + 1, 0, inserted);
            return next;
        });
        setHighlightQuery(q);
        setCurrentSlideIndex((i) => i + 1);
    };

    return (
        <div
            className="presentation-bg relative h-screen overflow-hidden selection:bg-primary/30 flex flex-col font-sans"
            dir="rtl"
            style={
                {
                    '--pres-font-size': `${effectiveFontSize}px`,
                } as React.CSSProperties
            }
        >
            <Head title={`عرض - ${copticDate || 'القداس'}`} />

            {/* ── Toolbar ── */}
            <div
                className={`fixed top-0 left-0 right-15 z-30 p-3 md:p-4 transition-all duration-500 ${isFullscreen ? 'opacity-0 hover:opacity-100' : ''}`}
            >
                <div className="max-w-screen-xl mx-auto flex items-center justify-between">
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
                        {copticDate ? (
                            <>
                                <span className="text-sm md:text-base font-bold text-primary hidden sm:inline-block">
                                    {copticDate}
                                </span>
                                <span className="text-xs text-muted-foreground hidden md:inline-block">{seasonLabel}</span>
                            </>
                        ) : (
                            <span className="text-sm font-bold text-primary">القداس الإلهي</span>
                        )}
                    </div>

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
                            variant={presentationMode === 'chroma' ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => setPresentationMode(p => p === 'normal' ? 'chroma' : 'normal')}
                            title={`نمط التقسيم: ${presentationMode === 'chroma' ? 'بث مباشر (Chroma)' : 'عادي (Normal)'}`}
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                        >
                            {presentationMode === 'chroma' ? <Tv className="h-4 w-4" /> : <TvMinimalPlay className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={hasMirrors ? closeMirrors : openMirrorWindow}
                            title={hasMirrors ? 'إغلاق الشاشات الملحقة' : 'فتح شاشة عرض ملحقة'}
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                        >
                            {hasMirrors ? <MonitorX className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                            {mirrorCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full font-bold">
                                    {mirrorCount}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={openChromaWindow}
                            title="فتح شاشة كروما (بث مباشر)"
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                        >
                            <Tv className="h-4 w-4" />
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
                onLocalResult={handleLocalSearchResult}
                onGlobalInsert={handleGlobalInsert}
                slides={deck}
            />

            <main
                ref={mainRef}
                className="flex min-h-0 flex-1 flex-col items-stretch justify-start overflow-hidden px-8 pt-4 pb-5 md:px-10 md:pt-5 md:pb-5"
            >
                <div className="pres-slide-column flex min-h-0 w-full max-w-none flex-1 flex-col justify-start">

                    {/*
                     * ── Slide Header ──
                     * هذا الـ div بيتقاس ارتفاعه بـ ResizeObserver
                     * وبيتخصم من effectiveReaderHeight قبل ما يتبعت للـ SplitViewReader
                     */}
                    <div ref={slideHeaderRef} className="flex w-full flex-shrink-0 flex-col items-center">
                        <div className="slide-section-header pres-section-header-scale mb-3 text-center md:mb-4">
                            <span className="ornament" aria-hidden="true" />
                            <span>{currentSlide.section_name}</span>
                            <span className="ornament" aria-hidden="true" />
                        </div>
                        <div className="ornamental-rule mb-3 md:mb-4">
                            <span className="ornament-diamond" />
                        </div>
                    </div>

                    {/*
                     * ── Reader Slot ──
                     * يقيس الارتفاع الكلي للمنطقة — لكن الـ SplitViewReader
                     * يستلم effectiveReaderHeight المخصوم منه الـ header
                     */}
                    <div
                        ref={readerSlotRef}
                        className="flex min-h-0 w-full flex-1 flex-col justify-center overflow-hidden"
                    >
                        {currentSlide.has_alternatives && currentSlide.alternatives ? (() => {
                            const signature = currentSlide.alternatives.map(a => a.label).join('|');
                            const activeIdx = altPreferences[signature] ?? currentSlide.active_index ?? 0;
                            const activeAlt = currentSlide.alternatives[activeIdx];
                            const slideAsSection: SlideAlternativeSection = {
                                id: currentSlide.id,
                                section_code: currentSlide.section_code,
                                section_name: currentSlide.section_name,
                                has_alternatives: true,
                                active_index: activeIdx,
                                alternatives: currentSlide.alternatives,
                            };
                            return (
                                <>
                                    <SplitViewReader
                                        key={`${currentSlide.id}-alt-${activeIdx}`}
                                        ref={readerRef}
                                        lines={activeAlt?.lines ?? []}
                                        hasCoptic={activeAlt?.has_coptic ?? false}
                                        justified={true}
                                        className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center"
                                        maxContentHeight={effectiveReaderHeight}
                                        fontSizePx={effectiveFontSize}
                                        highlightQuery={highlightQuery}
                                        onPaginationMetaChange={setReaderNav}
                                    />
                                    <div className="fixed bottom-2 left-16 z-40">
                                        <AlternativeSwitcher
                                            section={slideAsSection}
                                            onSelect={(index) => {
                                                setAltPreferences((prev) => ({
                                                    ...prev,
                                                    [signature]: index,
                                                }));
                                            }}
                                        />
                                    </div>
                                </>
                            );
                        })() : (
                            <SplitViewReader
                                key={currentSlide.id}
                                ref={readerRef}
                                lines={currentSlide.lines ?? []}
                                hasCoptic={currentSlide.has_coptic ?? false}
                                justified={true}
                                className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center"
                                maxContentHeight={effectiveReaderHeight}
                                fontSizePx={effectiveFontSize}
                                highlightQuery={highlightQuery}
                                intonation={currentSlide.intonation}
                                conclusion={currentSlide.conclusion}
                                onPaginationMetaChange={setReaderNav}
                            />
                        )}
                    </div>
                </div>
            </main>

            {/* ── أزرار التقليب العائمة ── */}
            <div
                className="fixed bottom-0 left-0 right-0 z-30 flex h-24 items-end justify-center pb-6 pointer-events-none"
            >
                <div
                    className={`flex items-center gap-3 pointer-events-auto pres-nav-controls rounded-full px-4 py-2 transition-all duration-500 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                        }`}
                >
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-muted disabled:opacity-30 text-foreground"
                        onClick={handleNextSlide}
                        disabled={currentSlideIndex === deck.length - 1 && readerNav.isLastPage}
                        aria-label="الشريحة التالية"
                    >
                        <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
                    </Button>
                    <span className="flex items-center px-3 md:px-4 font-mono text-base md:text-lg text-muted-foreground select-none whitespace-nowrap">
                        <span>{deck.length}</span>
                        <span className="mx-1.5 text-border">/</span>
                        <span className="text-foreground font-bold">{currentSlideIndex + 1}</span>
                    </span>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-muted disabled:opacity-30 text-foreground"
                        onClick={handlePrevSlide}
                        disabled={currentSlideIndex === 0 && readerNav.isFirstPage}
                        aria-label="الشريحة السابقة"
                    >
                        <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
                    </Button>
                </div>
            </div>

            {/* ── أزرار التكبير والتصغير العائمة ── */}
            <div
                className={`fixed bottom-4 left-4 z-40 flex flex-col gap-2 pointer-events-auto transition-all duration-500 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                    }`}
            >
                <Button
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full shadow-lg opacity-80 hover:opacity-100"
                    onClick={() => setZoomScale((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100))}
                    title="تكبير العرض"
                >
                    <Plus className="h-5 w-5" />
                </Button>
                <Button
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full shadow-lg opacity-80 hover:opacity-100"
                    onClick={() => setZoomScale((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100))}
                    title="تصغير العرض"
                >
                    <Minus className="h-5 w-5" />
                </Button>
                <Button
                    size="icon"
                    variant="secondary"
                    className="h-10 w-10 rounded-full shadow-lg opacity-80 hover:opacity-100"
                    onClick={() => setZoomScale(1)}
                    title="إعادة ضبط التكبير"
                >
                    <RotateCcw className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
