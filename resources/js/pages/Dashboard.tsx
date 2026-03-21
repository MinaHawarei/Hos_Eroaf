import HosLayout from '@/layouts/HosLayout';
import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    Clock,
    Mic,
    Moon as MoonIcon,
    Sparkles,
    Sun,
} from 'lucide-react';
import { useMemo, useEffect } from 'react';
import { DateSelector } from '@/components/DateSelector';
import { router } from '@inertiajs/react';
import { useDayContext } from '@/contexts/DayContext';

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
    season: string;
    seasonLabel: string;
    dayKey: string;
};

// Map season keys to icons and colors
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
    season,
    seasonLabel,
    dayKey,
}: Props) {
    const { setDateContext } = useDayContext();
    const currentSeasonStyle = useMemo(() => {
        return seasonStyles[season] || seasonStyles.annual;
    }, [season]);

    useEffect(() => {
        setDateContext(dayKey, copticDate.formatted, seasonLabel, []);
    }, [dayKey, copticDate.formatted, seasonLabel, setDateContext]);

    return (
        <HosLayout title="قراءات اليوم">
            <div className="space-y-6">
                {/* Hero Card — Today's date and season */}
                <div
                    className={`relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 bg-gradient-to-bl ${currentSeasonStyle.gradient}`}
                >
                    {/* Decorative pattern */}
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
                                قراءات اليوم
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
                                <DateSelector currentDate={dayKey} onDateChange={(d) => {
                                    localStorage.setItem('hos_selected_date', d);
                                    router.visit(`/?day=${d}`);
                                }} />
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-col gap-2 justify-center">
                             <>
                                <Link
                                    href={`#`}
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98]"
                                >
                                    <BookOpen className="h-4 w-4" />
                                    فتح القراءات
                                </Link>

                                <Link
                                    href={`/presentation/${dayKey}`}
                                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:bg-amber-500/20 active:scale-[0.98]"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    عرض الكنيسة
                                </Link>

                                <Link
                                    href={`#`}
                                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98]"
                                >
                                    <Mic className="h-4 w-4" />
                                    بدء الاستماع
                                </Link>
                            </>

                        </div>
                    </div>
                </div>

                {/* Sections Grid */}
                <div>
                    <h2 className="mb-4 text-lg font-semibold text-foreground">
                        أقسام القراءات
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                        <Link
                            href={`/presentation/${dayKey}`}
                            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.98]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-foreground">
                                    القطمارس
                                </h3>

                            </div>
                            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-1 rtl:rotate-0" />
                        </Link>
                        <Link
                            href={`/#`}
                            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.98]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold text-foreground">
                                    القداس الالهي
                                </h3>

                            </div>
                            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-1 rtl:rotate-0" />
                        </Link>
                        <Link
                            href={`/#`}
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
                            href={`/#`}
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
                            href={`/#`}
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
                            href={`/#`}
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
