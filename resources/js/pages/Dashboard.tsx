import HosLayout from '@/layouts/HosLayout';
import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    Monitor,
    Calendar,
    ChevronLeft,
    Clock,
    Mic,
    Moon as MoonIcon,
    Sparkles,
    Sun,
    Search,
} from 'lucide-react';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { DateSelector } from '@/components/DateSelector';
import { router } from '@inertiajs/react';
import { useDayContext } from '@/contexts/DayContext';
import { SearchOverlay } from '@/components/SearchOverlay';

// Types from the controller
type ReadingSection = {
    id: number;
    code: string;
    name_ar: string;
    reading_count: number;
};

type Props = {
    copticDate: {
        day: number;
        month: string;
        year: number;
        formatted: string;
    };
    gregorianDate: string;
    gregorianDateISO: string;
    season: string;
    seasonLabel: string;
    dayKey: string;
    dayName: string;
};

const seasonStyles: Record<string, { icon: any; gradient: string; badge: string }> = {
    annual: {
        icon: Sun,
        gradient: 'from-amber-500/10 to-orange-500/5',
        badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    great_lent: {
        icon: MoonIcon,
        gradient: 'from-violet-500/10 to-purple-500/5',
        badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
    },
    holy_week: {
        icon: Sparkles,
        gradient: 'from-rose-500/10 to-red-500/5',
        badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    },
    pentecost: {
        icon: Sparkles,
        gradient: 'from-emerald-500/10 to-green-500/5',
        badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
    jonah_fast: {
        icon: MoonIcon,
        gradient: 'from-blue-500/10 to-cyan-500/5',
        badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    },
};

export default function Dashboard({
    copticDate,
    gregorianDate,
    gregorianDateISO,
    season,
    seasonLabel,
    dayKey,
    dayName
}: Props) {
    const { setDateContext } = useDayContext();

    const currentSeasonStyle = useMemo(() => {
        return seasonStyles[season] || seasonStyles.annual;
    }, [season]);

    // State for search overlays
    const [lectionarySearchOpen, setLectionarySearchOpen] = useState(false);
    const [liturgySearchOpen, setLiturgySearchOpen] = useState(false);

    // ✅ استخدام useRef لتتبع ما إذا تم تحديث السياق بالفعل
    const contextUpdatedRef = useRef(false);

    /**
     * ✅ Handle search result from Dashboard
     * When a user selects a result from the search overlay in Dashboard,
     * navigate to the Presentation page with the selected dayKey.
     */
    const handleDashboardSearchResult = useCallback((slide: Record<string, unknown>) => {
        // Try to extract dayKey from the slide
        const slideId = (slide.id as string) || '';
        const dayKeyFromSlide = (slide.day_key as string) || '';

        // First priority: use explicit day_key if available
        if (dayKeyFromSlide) {
            router.visit(`/presentation/lectionary/${dayKeyFromSlide}?season=${season}`);
            setLectionarySearchOpen(false);
            setLiturgySearchOpen(false);
            return;
        }

        // Second priority: extract from slide ID
        const match = slideId.match(/^(lectionary|synaxarium)-([a-zA-Z0-9_]+)/);
        if (match) {
            const matchedDayKey = match[2];
            router.visit(`/presentation/lectionary/${matchedDayKey}?season=${season}`);
            setLectionarySearchOpen(false);
            setLiturgySearchOpen(false);
            return;
        }

        // Fallback: try to extract from any field that might contain the day key
        const possibleDayKey =
            (slide.day_key as string) ||
            (slide.dayKey as string) ||
            (slide.date_key as string) ||
            (slide.key as string);

        if (possibleDayKey) {
            router.visit(`/presentation/lectionary/${possibleDayKey}?season=${season}`);
            setLectionarySearchOpen(false);
            setLiturgySearchOpen(false);
        }
    }, [season]);

    /**
     * ✅ Handle local search result
     */
    const handleLocalResult = useCallback((slideId: string, query: string) => {
        const match = slideId.match(/^(lectionary|synaxarium)-([a-zA-Z0-9_]+)/);
        if (match) {
            const matchedDayKey = match[2];
            router.visit(`/presentation/lectionary/${matchedDayKey}?season=${season}`);
            setLectionarySearchOpen(false);
            setLiturgySearchOpen(false);
        }
    }, [season]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setLectionarySearchOpen(true);
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
                e.preventDefault();
                setLiturgySearchOpen(true);
            }

            if (e.key === 'f' && (e.target as HTMLElement).tagName !== 'INPUT') {
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ✅ Update day context - مع منع التحديثات المتكررة
    useEffect(() => {
        // ✅ منع التحديث إذا تم التحديث بالفعل
        if (contextUpdatedRef.current) {
            return;
        }

        setDateContext(
            gregorianDateISO,
            copticDate.formatted,
            season,
            []
        );

        contextUpdatedRef.current = true;

        // ✅ إعادة تعيين الـ ref بعد 100ms للسماح بتحديثات مستقبلية
        const timeout = setTimeout(() => {
            contextUpdatedRef.current = false;
        }, 100);

        return () => clearTimeout(timeout);
    }, [gregorianDateISO, copticDate.formatted, season, setDateContext]);

    const navigateToLectionary = useCallback(() => {
        router.visit(`/presentation/lectionary/${dayKey}?season=${season}`);
    }, [dayKey, season]);

    const navigateToLiturgy = useCallback(() => {
        const params = new URLSearchParams({
            season: season,
            dayKey: dayKey,
            dayName: dayName
        });
        router.visit(`/presentation/liturgy?${params.toString()}`);
    }, [dayKey, season, dayName]);

    return (
        <HosLayout title="قراءات اليوم">
            <SearchOverlay
                open={lectionarySearchOpen}
                onOpenChange={setLectionarySearchOpen}
                onGlobalInsert={handleDashboardSearchResult}
                onLocalResult={handleLocalResult}
                searchType="lectionary"
            />

            <SearchOverlay
                open={liturgySearchOpen}
                onOpenChange={setLiturgySearchOpen}
                onGlobalInsert={handleDashboardSearchResult}
                onLocalResult={handleLocalResult}
                searchType="liturgy"
            />

            <div className="space-y-6">
                {/* Hero Card */}
                <div
                    className={`relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 bg-gradient-to-bl ${currentSeasonStyle.gradient}`}
                >
                    <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-accent/5 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${currentSeasonStyle.badge}`}
                                >
                                    <currentSeasonStyle.icon className="h-3.5 w-3.5" />
                                    {seasonLabel}
                                </span>
                            </div>

                            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                                قراءات اليوم - {dayName}
                            </h1>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{copticDate.formatted}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{gregorianDate}</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <DateSelector
                                    currentDate={gregorianDateISO}
                                    onDateChange={(d) => {
                                        localStorage.setItem('hos_selected_date', d);
                                        router.visit(`/?day=${d}`);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-2 justify-center">
                            <Link
                                href={'#'}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]"
                            >
                                <BookOpen className="h-4 w-4" />
                               الاستماع للقداس
                            </Link>

                            <Link
                                href={'#'}
                                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:bg-amber-500/20 active:scale-[0.98]"
                            >
                                <Sparkles className="h-4 w-4" />
                                عرض القداس
                            </Link>

                            <button
                                type="button"
                                onClick={() => setLiturgySearchOpen(true)}
                                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] cursor-pointer"
                                title="Ctrl+Shift+K للبحث في القداس"
                            >
                                <Search className="h-4 w-4" />
                                البحث في القداس
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sections Grid */}
                <div>
                    <h2 className="mb-4 text-lg font-semibold text-foreground">
                        Liturgical Sections
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                        {/* Lectionary Section */}
                        <div className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-base font-bold text-foreground font-reading mb-0.5">
                                        القطمارس
                                    </h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                                <button
                                    type="button"
                                    onClick={navigateToLectionary}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-2 text-sm font-bold shadow-sm transition-all hover:bg-amber-500/20 active:scale-[0.96] cursor-pointer"
                                >
                                    <Monitor className="h-4 w-4" />
                                    <span>عرض</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setLectionarySearchOpen(true)}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-background px-2 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.96] cursor-pointer"
                                    title="Ctrl+K للبحث في القطمارس"
                                >
                                    <Search className="h-4 w-4" />
                                    <span>بحث</span>
                                </button>
                            </div>
                        </div>

                        {/* Liturgy Section */}
                        <div className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-base font-bold text-foreground font-reading mb-0.5">
                                        القداس الالهي
                                    </h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                                <button
                                    type="button"
                                    onClick={navigateToLiturgy}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-2 text-sm font-bold shadow-sm transition-all hover:bg-amber-500/20 active:scale-[0.96] cursor-pointer"
                                >
                                    <Monitor className="h-4 w-4" />
                                    <span>عرض</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setLiturgySearchOpen(true)}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-background px-2 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.96] cursor-pointer"
                                    title="Ctrl+Shift+K للبحث في القداس"
                                >
                                    <Search className="h-4 w-4" />
                                    <span>بحث</span>
                                </button>
                            </div>
                        </div>

                        {/* Other sections */}
                        <Link
                            href={`/presentation/lectionary/${dayKey}?season=${season}&mode=vespers`}
                            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.98]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-foreground">
                                    رفع بخور عشية
                                </h3>
                            </div>
                            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-1 rtl:rotate-0" />
                        </Link>

                        <Link
                            href={`/presentation/lectionary/${dayKey}?season=${season}&mode=agpeya`}
                            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.98]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-foreground">
                                    الاجبية
                                </h3>
                            </div>
                            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-1 rtl:rotate-0" />
                        </Link>

                        <Link
                            href={`/presentation/lectionary/${dayKey}?season=${season}&mode=psalms`}
                            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.98]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-foreground">
                                    تسبحة
                                </h3>
                            </div>
                            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-1 rtl:rotate-0" />
                        </Link>

                        <Link
                            href={`/presentation/lectionary/${dayKey}?season=${season}&mode=hymns`}
                            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.98]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-foreground">
                                    ترانيم
                                </h3>
                            </div>
                            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-1 rtl:rotate-0" />
                        </Link>
                    </div>
                </div>
            </div>
        </HosLayout>
    );
}
