import React from 'react';
import { cn } from '@/lib/utils';

interface Line {
    id: number;
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    text: string;
    speaker?: string;
}

interface SplitViewReaderProps {
    lines: Line[];
    hasCoptic: boolean;
    className?: string;
    justified?: boolean;
}

export function SplitViewReader({ lines, hasCoptic, className, justified = true }: SplitViewReaderProps) {

    // 1. المساعدة لتحديد استايل المتحدث
    const getSpeakerStyles = (speaker?: string) => {
        if (!speaker) return "";
        const s = speaker.trim();
        if (s.includes('الكاهن'))
            return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800";
        if (s.includes('الشعب'))
            return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800";
        if (s.includes('الشماس'))
            return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800";
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    };

    const hasText = (obj: any) => obj && obj.text && obj.text.trim().length > 0;

    // --- حالة عرض اللغة العربية فقط (بدون قبطي) ---
    if (!hasCoptic) {
        return (
            <div className={cn("flex flex-col gap-6 max-w-5xl mx-auto w-full px-4", className)}>
                {lines.map((line, index) => {
                    const prevSpeaker = index > 0 ? lines[index - 1].speaker : null;
                    const shouldShowSpeaker = line.speaker && line.speaker !== prevSpeaker;

                    return (
                        <div key={line.id || index} className="flex flex-col gap-4">
                            {shouldShowSpeaker && (
                                <div className="flex items-center gap-4 my-4">
                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border" />
                                    <span className={cn("px-5 py-1.5 rounded-full text-sm font-bold border shadow-sm", getSpeakerStyles(line.speaker))}>
                                        {line.speaker}
                                    </span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border" />
                                </div>
                            )}
                            <p className={cn(
                                "text-3xl md:text-5xl lg:text-6xl leading-[1.8] font-reading font-bold text-foreground",
                                justified ? "text-justified" : "text-center"
                            )} dir="rtl">
                                {line.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        );
    }

    // --- حالة العرض الثلاثي (عربي - معرب - قبطي) ---
    const arabicLines = lines.filter((l) => l.lang_type === 'arabic');
    const arcopticLines = lines.filter((l) => l.lang_type === 'coptic_arabized');
    const copticLines = lines.filter((l) => l.lang_type === 'coptic');

    const pairedLines: (Line | null)[][] = [];
    const maxLen = Math.max(arabicLines.length, copticLines.length, arcopticLines.length);
    for (let i = 0; i < maxLen; i++) {
        pairedLines.push([
            arabicLines[i] || null,
            arcopticLines[i] || null,
            copticLines[i] || null,
        ]);
    }

    return (
        <div className={cn("flex flex-col w-full max-w-7xl mx-auto gap-8 px-4", className)}>
            {pairedLines.map(([ar, arcop, cop], index) => {
                const showAr = hasText(ar);
                const showArcop = hasText(arcop);
                const showCop = hasText(cop);

                // تحديد المتحدث الحالي من أي عمود متاح
                const currentSpeaker = ar?.speaker || arcop?.speaker || cop?.speaker;

                // مقارنة مع المتحدث السابق
                const previousLine = index > 0 ? pairedLines[index - 1] : null;
                const previousSpeaker = previousLine
                    ? (previousLine[0]?.speaker || previousLine[1]?.speaker || previousLine[2]?.speaker)
                    : null;

                const shouldShowSpeaker = currentSpeaker && currentSpeaker !== previousSpeaker;

                if (!showAr && !showArcop && !showCop) return null;

                return (
                    <div key={index} className="flex flex-col gap-6 slide-content-enter" style={{ animationDelay: `${index * 0.05}s` }}>

                        {/* ملصق المتحدث يظهر فقط عند التغيير */}
                        {shouldShowSpeaker && (
                            <div className="flex items-center gap-4 w-full mt-8 mb-2">
                                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                                <span className={cn(
                                    "px-8 py-2 rounded-xl text-lg md:text-3xl font-black border shadow-sm transition-all hover:scale-105",
                                    getSpeakerStyles(currentSpeaker)
                                )}>
                                    {currentSpeaker}
                                </span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-stretch">
                            {/* العمود العربي */}
                            {showAr && ar && (
                                <div className="flex-1 w-full">
                                    <p className={cn(
                                        "text-2xl md:text-4xl lg:text-5xl leading-[1.6] text-foreground font-reading font-bold drop-shadow-sm",
                                        justified ? "text-justified" : "text-right"
                                    )} dir="rtl">
                                        {ar.text}
                                    </p>
                                </div>
                            )}

                            {/* فاصل إذا وجد عربي وبعده شيء آخر */}
                            {showAr && (showArcop || showCop) && (
                                <div className="hidden md:block column-divider" aria-hidden="true" />
                            )}

                            {/* عمود المعرب (نبيتي/سماوي) */}
                            {showArcop && arcop && (
                                <div className="flex-1 w-full">
                                    <p className={cn(
                                        "text-2xl md:text-4xl lg:text-5xl leading-[1.6] font-reading font-bold",
                                        "!text-[#880808] dark:text-sky-400",
                                        justified ? "text-justified" : "text-right"
                                    )} dir="rtl">
                                        {arcop.text}
                                    </p>
                                </div>
                            )}

                            {/* فاصل إذا وجد معرب وبعده قبطي */}
                            {(showAr || showArcop) && showCop && (
                                <div className="hidden md:block column-divider" aria-hidden="true" />
                            )}

                            {/* عمود القبطي (Ltr) */}
                            {showCop && cop && (
                                <div className="flex-1 w-full">
                                    <p className="text-2xl md:text-4xl lg:text-5xl leading-[1.6] text-foreground font-reading font-bold" dir="ltr">
                                        {cop.text}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
