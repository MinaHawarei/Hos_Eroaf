import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { TextPaginator } from '@/utils/TextPaginator';

export interface Line {
    id: number;
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    text: string;
    speaker?: string;
}

export interface SplitViewReaderProps {
    lines: Line[];
    hasCoptic: boolean;
    className?: string;
    justified?: boolean;
}

export interface SplitViewReaderRef {
    nextPage: () => boolean;
    prevPage: () => boolean;
    isFirstPage: boolean;
    isLastPage: boolean;
}

export const SplitViewReader = forwardRef<SplitViewReaderRef, SplitViewReaderProps>(({ lines, hasCoptic, className, justified = true }, ref) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [pages, setPages] = useState<Line[][]>([lines]); // Default to all lines as 1 page initially

    // Initialize Pagination
    useEffect(() => {
        setCurrentPage(0);
        
        if (!lines || lines.length === 0) {
            setPages([]);
            return;
        }

        const maxContentHeight = typeof window !== 'undefined' ? window.innerHeight * 0.70 : 600;
        const paginator = new TextPaginator('slide-content-enter');
        const computedPages: Line[][] = [];

        if (hasCoptic) {
            // Group Coptic pairs safely
            const arabicLines = lines.filter((l) => l.lang_type === 'arabic');
            const arcopticLines = lines.filter((l) => l.lang_type === 'coptic_arabized');
            const copticLines = lines.filter((l) => l.lang_type === 'coptic');
            
            const maxLen = Math.max(arabicLines.length, copticLines.length, arcopticLines.length);
            let currentHeight = 0;
            let currentChunk: Line[] = [];

            for (let i = 0; i < maxLen; i++) {
                const ar = arabicLines[i];
                const copAr = arcopticLines[i];
                const cop = copticLines[i];

                const simulatedHtml = `
                    <div class="flex gap-10">
                        <p class="flex-1">${ar?.text || ''}</p>
                        <p class="flex-1">${copAr?.text || ''}</p>
                        <p class="flex-1">${cop?.text || ''}</p>
                    </div>
                `;

                // @ts-ignore
                const h = paginator.measureHeight(simulatedHtml);

                // If adding this block exceeds height, wrap to new page
                if (currentHeight + h > maxContentHeight && currentChunk.length > 0) {
                    computedPages.push(currentChunk);
                    currentChunk = [];
                    currentHeight = 0;
                }

                if (ar) currentChunk.push(ar);
                if (copAr) currentChunk.push(copAr);
                if (cop) currentChunk.push(cop);

                currentHeight += h;
            }

            if (currentChunk.length > 0) {
                computedPages.push(currentChunk);
            }
        } else {
            // Arabic only: Split long text blocks if necessary
            let currentHeight = 0;
            let currentChunk: Line[] = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // @ts-ignore
                const h = paginator.measureHeight(line.text);

                // If a SINGLE line is enormous, split its text into smaller blocks
                if (h > maxContentHeight) {
                    if (currentChunk.length > 0) {
                        computedPages.push(currentChunk);
                        currentChunk = [];
                        currentHeight = 0;
                    }
                    
                    const chunks = paginator.paginate(line.text, maxContentHeight);
                    chunks.forEach(chunk => {
                        computedPages.push([{ ...line, text: chunk }]);
                    });
                    continue;
                }

                if (currentHeight + h > maxContentHeight && currentChunk.length > 0) {
                    computedPages.push(currentChunk);
                    currentChunk = [];
                    currentHeight = 0;
                }

                currentChunk.push(line);
                currentHeight += h;
            }

            if (currentChunk.length > 0) {
                computedPages.push(currentChunk);
            }
        }

        paginator.cleanup();
        setPages(computedPages.length > 0 ? computedPages : [lines]);
    }, [lines, hasCoptic]);

    // Expose pagination controls to Parent (PresentationPage)
    useImperativeHandle(ref, () => ({
        nextPage: () => {
            if (currentPage < pages.length - 1) {
                setCurrentPage(prev => prev + 1);
                return true;
            }
            return false;
        },
        prevPage: () => {
            if (currentPage > 0) {
                setCurrentPage(prev => prev - 1);
                return true;
            }
            return false;
        },
        isFirstPage: currentPage === 0,
        isLastPage: currentPage === pages.length - 1
    }));

    const currentLines = pages[currentPage] || [];

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
                {currentLines.map((line, index) => {
                    const prevSpeaker = index > 0 ? currentLines[index - 1].speaker : null;
                    const shouldShowSpeaker = line.speaker && line.speaker !== prevSpeaker;

                    return (
                        <div key={`${currentPage}-${line.id || index}`} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
    const arabicLines = currentLines.filter((l) => l.lang_type === 'arabic');
    const arcopticLines = currentLines.filter((l) => l.lang_type === 'coptic_arabized');
    const copticLines = currentLines.filter((l) => l.lang_type === 'coptic');

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

                        <div className="flex flex-col flex-row gap-6 md:gap-10 items-start md:items-stretch">
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
                                        "!text-[#880808] dark:!text-sky-400",
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
});
