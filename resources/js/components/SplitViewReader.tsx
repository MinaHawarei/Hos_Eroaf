import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TextPaginator } from '@/utils/TextPaginator';
import { SearchService } from '@/services/SearchService';

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
    /** Available height (px) for paginated body content inside the slide. */
    maxContentHeight: number;
    /** Base × zoom; must match --pres-font-size for accurate pagination. */
    fontSizePx: number;
    highlightQuery?: string;
    onPaginationMetaChange?: (meta: {
        isFirstPage: boolean;
        isLastPage: boolean;
        pageCount: number;
        pageIndex: number;
    }) => void;
}

export interface SplitViewReaderRef {
    nextPage: () => boolean;
    prevPage: () => boolean;
    isFirstPage: boolean;
    isLastPage: boolean;
}

function lineHtml(line: Line, highlightQuery: string | undefined): { __html: string } {
    const raw = line.text ?? '';
    if (!highlightQuery?.trim()) {
        return { __html: raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') };
    }
    return { __html: SearchService.highlightMatch(highlightQuery, raw) };
}

export const SplitViewReader = forwardRef<SplitViewReaderRef, SplitViewReaderProps>(
    (
        {
            lines,
            hasCoptic,
            className,
            justified = true,
            maxContentHeight,
            fontSizePx,
            highlightQuery,
            onPaginationMetaChange,
        },
        ref
    ) => {
        const [currentPage, setCurrentPage] = useState(0);
        const [pages, setPages] = useState<Line[][]>([lines]);

        const emitMeta = useCallback(
            (page: number, pgs: Line[][]) => {
                const pageCount = pgs.length;
                onPaginationMetaChange?.({
                    isFirstPage: page <= 0,
                    isLastPage: pageCount === 0 || page >= pageCount - 1,
                    pageCount,
                    pageIndex: page,
                });
            },
            [onPaginationMetaChange]
        );

        useEffect(() => {
            setCurrentPage(0);

            if (!lines || lines.length === 0) {
                setPages([]);
                emitMeta(0, []);
                return;
            }

            const budget = Math.max(80, maxContentHeight);
            const paginator = new TextPaginator('slide-content-enter', fontSizePx);
            const computedPages: Line[][] = [];

            if (hasCoptic) {
                const arabicLines = lines.filter((l) => l.lang_type === 'arabic');
                const arcopticLines = lines.filter((l) => l.lang_type === 'coptic_arabized');
                const copticLines = lines.filter((l) => l.lang_type === 'coptic');

                const maxLen = Math.max(arabicLines.length, arcopticLines.length, copticLines.length);
                let currentHeight = 0;
                let currentChunk: Line[] = [];

                for (let i = 0; i < maxLen; i++) {
                    const ar = arabicLines[i];
                    const copAr = arcopticLines[i];
                    const cop = copticLines[i];

                    const h = paginator.measureTripleColumnRowHeight(
                        ar?.text ?? '',
                        copAr?.text ?? '',
                        cop?.text ?? ''
                    );

                    const prevRowSpeaker =
                        i > 0
                            ? arabicLines[i - 1]?.speaker ||
                              arcopticLines[i - 1]?.speaker ||
                              copticLines[i - 1]?.speaker ||
                              null
                            : null;
                    const rowSpeaker =
                        ar?.speaker || arcopticLines[i]?.speaker || copticLines[i]?.speaker || null;
                    const speakerChanged = Boolean(rowSpeaker && rowSpeaker !== prevRowSpeaker && i > 0);
                    const rowCost = h + (speakerChanged ? 72 : 0);

                    if (currentHeight + rowCost > budget && currentChunk.length > 0) {
                        computedPages.push(currentChunk);
                        currentChunk = [];
                        currentHeight = 0;
                    }

                    if (ar) {
                        currentChunk.push(ar);
                    }
                    if (copAr) {
                        currentChunk.push(copAr);
                    }
                    if (cop) {
                        currentChunk.push(cop);
                    }

                    currentHeight += rowCost;
                }

                if (currentChunk.length > 0) {
                    computedPages.push(currentChunk);
                }
            } else {
                let currentHeight = 0;
                let currentChunk: Line[] = [];

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const prev = lines[i - 1];
                    const speakerChanged = Boolean(
                        line.speaker && line.speaker !== prev?.speaker && i > 0
                    );
                    const h = paginator.measureArabicParagraphHeight(line.text) + (speakerChanged ? 72 : 0);

                    if (h > budget) {
                        if (currentChunk.length > 0) {
                            computedPages.push(currentChunk);
                            currentChunk = [];
                            currentHeight = 0;
                        }

                        const chunks = paginator.paginate(line.text, budget);
                        chunks.forEach((chunk) => {
                            computedPages.push([{ ...line, text: chunk }]);
                        });
                        continue;
                    }

                    if (currentHeight + h > budget && currentChunk.length > 0) {
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
            const finalPages = computedPages.length > 0 ? computedPages : [lines];
            setPages(finalPages);
            emitMeta(0, finalPages);
        }, [lines, hasCoptic, maxContentHeight, fontSizePx, emitMeta]);

        useEffect(() => {
            emitMeta(currentPage, pages);
        }, [currentPage, pages, emitMeta]);

        useImperativeHandle(
            ref,
            () => ({
                nextPage: () => {
                    if (currentPage < pages.length - 1) {
                        setCurrentPage((prev) => prev + 1);
                        return true;
                    }
                    return false;
                },
                prevPage: () => {
                    if (currentPage > 0) {
                        setCurrentPage((prev) => prev - 1);
                        return true;
                    }
                    return false;
                },
                isFirstPage: currentPage === 0,
                isLastPage: pages.length === 0 || currentPage === pages.length - 1,
            }),
            [currentPage, pages.length]
        );

        const currentLines = pages[currentPage] || [];

        const getSpeakerStyles = (speaker?: string) => {
            if (!speaker) {
                return '';
            }
            const s = speaker.trim();
            if (s.includes('الكاهن')) {
                return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
            }
            if (s.includes('الشعب')) {
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
            }
            if (s.includes('الشماس')) {
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
            }
            return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        };

        const hasText = (obj: Line | null | undefined) => obj && obj.text && obj.text.trim().length > 0;

        if (!hasCoptic) {
            return (
                <div className={cn('flex flex-col gap-6 max-w-5xl mx-auto w-full px-4 min-h-0 overflow-hidden', className)}>
                    {currentLines.map((line, index) => {
                        const prevSpeaker = index > 0 ? currentLines[index - 1].speaker : null;
                        const shouldShowSpeaker = line.speaker && line.speaker !== prevSpeaker;

                        return (
                            <div
                                key={`${currentPage}-${line.id}-${index}`}
                                className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                            >
                                {shouldShowSpeaker && (
                                    <div className="flex items-center gap-4 my-4">
                                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border" />
                                        <span
                                            className={cn(
                                                'pres-speaker-badge px-5 py-1.5 rounded-full font-bold border shadow-sm',
                                                getSpeakerStyles(line.speaker)
                                            )}
                                        >
                                            {line.speaker}
                                        </span>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border" />
                                    </div>
                                )}
                                <p
                                    className={cn(
                                        'pres-slide-body-text leading-[1.8] font-reading font-bold text-foreground',
                                        justified ? 'text-justified' : 'text-center'
                                    )}
                                    dir="rtl"
                                    dangerouslySetInnerHTML={lineHtml(line, highlightQuery)}
                                />
                            </div>
                        );
                    })}
                </div>
            );
        }

        const arabicLines = currentLines.filter((l) => l.lang_type === 'arabic');
        const arcopticLines = currentLines.filter((l) => l.lang_type === 'coptic_arabized');
        const copticLines = currentLines.filter((l) => l.lang_type === 'coptic');

        const pairedLines: (Line | null)[][] = [];
        const maxLen = Math.max(arabicLines.length, copticLines.length, arcopticLines.length);
        for (let i = 0; i < maxLen; i++) {
            pairedLines.push([arabicLines[i] || null, arcopticLines[i] || null, copticLines[i] || null]);
        }

        return (
            <div className={cn('flex flex-col w-full max-w-7xl mx-auto gap-8 px-4 min-h-0 overflow-hidden', className)}>
                {pairedLines.map(([ar, arcop, cop], index) => {
                    const showAr = hasText(ar);
                    const showArcop = hasText(arcop);
                    const showCop = hasText(cop);

                    const currentSpeaker = ar?.speaker || arcop?.speaker || cop?.speaker;

                    const previousLine = index > 0 ? pairedLines[index - 1] : null;
                    const previousSpeaker = previousLine
                        ? previousLine[0]?.speaker || previousLine[1]?.speaker || previousLine[2]?.speaker
                        : null;

                    const shouldShowSpeaker = currentSpeaker && currentSpeaker !== previousSpeaker;

                    if (!showAr && !showArcop && !showCop) {
                        return null;
                    }

                    return (
                        <div
                            key={`p${currentPage}-row-${index}`}
                            className="flex flex-col gap-6"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {shouldShowSpeaker && (
                                <div className="flex items-center gap-4 w-full">
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                                    <span
                                        className={cn(
                                            'pres-speaker-badge-lg px-8 py-2 rounded-xl font-black border shadow-sm transition-all hover:scale-105',
                                            getSpeakerStyles(currentSpeaker)
                                        )}
                                    >
                                        {currentSpeaker}
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-stretch">
                                {showAr && ar && (
                                    <div className="flex-1 w-full">
                                        <p
                                            className={cn(
                                                'pres-slide-body-text leading-[1.6] text-foreground font-reading font-bold drop-shadow-sm',
                                                justified ? 'text-justified' : 'text-right'
                                            )}
                                            dir="rtl"
                                            dangerouslySetInnerHTML={lineHtml(ar, highlightQuery)}
                                        />
                                    </div>
                                )}

                                {showAr && (showArcop || showCop) && (
                                    <div className="hidden md:block column-divider" aria-hidden="true" />
                                )}

                                {showArcop && arcop && (
                                    <div className="flex-1 w-full">
                                        <p
                                            className={cn(
                                                'pres-slide-body-text leading-[1.6] font-reading font-bold',
                                                '!text-[#880808] dark:!text-sky-400',
                                                justified ? 'text-justified' : 'text-right'
                                            )}
                                            dir="rtl"
                                            dangerouslySetInnerHTML={lineHtml(arcop, highlightQuery)}
                                        />
                                    </div>
                                )}

                                {(showAr || showArcop) && showCop && (
                                    <div className="hidden md:block column-divider" aria-hidden="true" />
                                )}

                                {showCop && cop && (
                                    <div className="flex-1 w-full">
                                        <p
                                            className="pres-slide-body-text leading-[1.6] text-foreground font-reading font-bold"
                                            dir="ltr"
                                            dangerouslySetInnerHTML={lineHtml(cop, highlightQuery)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
});

SplitViewReader.displayName = 'SplitViewReader';
