import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { usePresentationNavigation } from '@/hooks/usePresentationNavigation';
import { useExternalPresentation } from '@/hooks/useExternalPresentation';
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
} from 'lucide-react';
import Cookies from 'js-cookie';

import { LiturgySection, SlideAlternativeItem, SlideAlternativeSection } from '@/types';
import { AlternativeSwitcher } from '@/components/Liturgy/AlternativeSwitcher';

interface Slide {
    id: string;
    section_code: string;
    section_name: string;
    intonation_ar?: string | null;
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
    // تفضيلات الاختيار العالمية — key = مجموعة labels مع بعض (signature)، value = index
    const [altPreferences, setAltPreferences] = useState<Record<string, number>>({});

    const [baseFontSize] = useState(() => {
        const fromCookie = Number(Cookies.get('baseFontSize'));
        if (Number.isFinite(fromCookie) && fromCookie > 0) {
            return fromCookie;
        }
        return defaultBaseFontSize;
    });

    const [zoomScale, setZoomScale] = useState(readStoredZoom);

    const readerRef = React.useRef<SplitViewReaderRef>(null);
    const readerSlotRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLElement>(null);
    const [readerSlotHeight, setReaderSlotHeight] = useState(400);
    const [readerNav, setReaderNav] = useState({
        isFirstPage: true,
        isLastPage: true,
    });

    const effectiveFontSize = Math.round(baseFontSize * zoomScale);

    // دالة معالجة وتقسيم الشرائح
    const processAndSplitSlides = useCallback(async () => {
        if (!slidesProp || slidesProp.length === 0) {
            setDeck([]);
            setIsSplitting(false);
            return;
        }

        setIsSplitting(true);

        try {
            // إنشاء TextPaginator للقياسات الدقيقة
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

            // استخدام ارتفاع الـ container الفعلي أو قيمة افتراضية
            const availableHeight = Math.max(300, readerSlotHeight);

            // تقسيم الشرائح الكبيرة
            const result = await splitLargeSlides(
                slidesProp,
                availableHeight,
                effectiveFontSize,
                containerWidth,
                measureAdapter
            );

            setDeck(result.slides);
            setSplitInfo(result);

            // تنظيف الـ paginator
            paginator.cleanup();

            // تسجيل معلومات التقسيم في الكونسول للتطوير
            if (result.totalSplitSlides > result.totalOriginalSlides) {
                console.log(
                    `تم تقسيم الشرائح: ${result.totalOriginalSlides} → ${result.totalSplitSlides} شريحة ` +
                    `(+${result.totalSplitSlides - result.totalOriginalSlides} شريحة جديدة)`
                );
            }
        } catch (error) {
            console.error('خطأ في تقسيم الشرائح:', error);
            // في حالة الخطأ، استخدم الشرائح الأصلية
            setDeck(slidesProp);
        } finally {
            setIsSplitting(false);
        }
    }, [slidesProp, effectiveFontSize, readerSlotHeight]);

    // تأثير لتقسيم الشرائح عند تغيير البيانات أو حجم الخط أو ارتفاع الحاوية
    useEffect(() => {
        processAndSplitSlides();
    }, [processAndSplitSlides]);

    useEffect(() => {
        setCurrentSlideIndex(0);
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

    const { broadcastSlide, openExternalWindow, closeAllExternal, externalCount, hasExternalWindows } =
        useExternalPresentation();

    const currentSlide = deck?.[currentSlideIndex];

    useEffect(() => {
        setHighlightQuery(undefined);
        setReaderNav({ isFirstPage: true, isLastPage: true });
    }, [currentSlideIndex]);

    useEffect(() => {
        if (currentSlide) {
            broadcastSlide({
                slideIndex: currentSlideIndex,
                slide: currentSlide,
                copticDate,
                seasonLabel,
                totalSlides: deck.length,
            });
        }
    }, [currentSlideIndex, currentSlide, copticDate, seasonLabel, deck.length, broadcastSlide]);

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

    // شاشة التحميل أثناء تقسيم الشرائح
    if (isSplitting) {
        return (
            <div className="presentation-bg flex h-screen items-center justify-center p-8" dir="rtl">
                <Head title="جاري التحميل..." />
                <div className="text-center heritage-surface rounded-2xl p-12 max-w-md">
                    <Loader2 className="h-16 w-16 text-primary/30 mx-auto mb-6 animate-spin" />
                    <h1 className="text-2xl font-serif font-bold mb-4 text-foreground">جاري تجهيز العرض</h1>
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
                    <h1 className="text-2xl font-serif font-bold mb-4 text-foreground">لا توجد قراءات مسجلة لهذا اليوم</h1>
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
                            variant="ghost"
                            size="icon"
                            onClick={hasExternalWindows ? closeAllExternal : openExternalWindow}
                            title={hasExternalWindows ? 'إغلاق الشاشات الخارجية' : 'عرض على شاشة خارجية'}
                            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                        >
                            {hasExternalWindows ? <MonitorX className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
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
                className="flex min-h-0 flex-1 flex-col items-stretch justify-start overflow-hidden px-8 pt-4 md:px-10 md:pt-5"
            >
                <div className="pres-slide-column flex min-h-0 w-full max-w-none flex-1 flex-col justify-start">
                    <div className="flex w-full flex-shrink-0 flex-col items-center">
                        <div className="slide-section-header pres-section-header-scale mb-3 text-center md:mb-4">
                            <span className="ornament" aria-hidden="true" />
                            <span>{currentSlide.section_name}</span>
                            <span className="ornament" aria-hidden="true" />
                        </div>
                        {currentSlide.intonation_ar && (
                            <div className="intonation-badge pres-intonation-scale mb-3 text-center md:mb-4">
                                {currentSlide.intonation_ar}
                            </div>
                        )}
                        <div className="ornamental-rule mb-3 md:mb-4">
                            <span className="ornament-diamond" />
                        </div>

                    </div>

                    <div
                        ref={readerSlotRef}
                        className="flex min-h-0 w-full flex-1 flex-col justify-center overflow-hidden"
                    >
                        {currentSlide.has_alternatives && currentSlide.alternatives ? (() => {
                            // signature = labels مع بعض تعرّف نوع الاختيار
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
                                        maxContentHeight={readerSlotHeight}
                                        fontSizePx={effectiveFontSize}
                                        highlightQuery={highlightQuery}
                                        onPaginationMetaChange={setReaderNav}
                                    />
                                    {/* الزرار ثابت أسفل يسار */}
                                    <div className="fixed bottom-20 left-4 z-40">
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
                                maxContentHeight={readerSlotHeight}
                                fontSizePx={effectiveFontSize}
                                highlightQuery={highlightQuery}
                                onPaginationMetaChange={setReaderNav}
                            />
                        )}
                    </div>
                </div>
            </main>

            <div
                className={`fixed bottom-4 left-0 right-0 z-30 flex items-center justify-center pointer-events-none transition-all duration-500 ${isFullscreen ? 'opacity-0 hover:opacity-100' : ''}`}
            >
                <div className="flex items-center gap-3 pointer-events-auto pres-nav-controls rounded-full px-4 py-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-muted disabled:opacity-30 text-foreground"
                        onClick={handlePrevSlide}
                        disabled={currentSlideIndex === 0 && readerNav.isFirstPage}
                        aria-label="الشريحة السابقة"
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
                        onClick={handleNextSlide}
                        disabled={currentSlideIndex === deck.length - 1 && readerNav.isLastPage}
                        aria-label="الشريحة التالية"
                    >
                        <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
                    </Button>
                </div>
            </div>

            <div
                className={`fixed bottom-24 left-4 z-40 flex flex-col gap-2 transition-all duration-500 ${isFullscreen ? 'opacity-0 hover:opacity-100' : ''}`}
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
