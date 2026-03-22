import React, {
    useState,
    useEffect,
    useImperativeHandle,
    forwardRef,
    useCallback,
    useRef,
    useLayoutEffect,
    useMemo,
} from 'react';
import { cn } from '@/lib/utils';
import { TextPaginator } from '@/utils/TextPaginator';
import { SearchService } from '@/services/SearchService';
import { computeSlidePages } from '@/utils/computeSlidePages';
import {
    PRES_BODY_LEADING_CLASS,
    linesHaveCopticScript,
    paginationTolerancePx,
    resolveMultiColumnMode,
    type MultiColumnMode,
} from '@/utils/presentationLayout';

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
    maxContentHeight: number;
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

const rowGapClass = 'gap-3 md:gap-4';

function bodyParagraphClassNames(
    justified: boolean,
    extra?: string,
    isRtl: boolean = true
): string {
    return cn(
        'pres-slide-body-text font-reading font-bold break-words',
        PRES_BODY_LEADING_CLASS,
        justified
            ? isRtl
                ? 'text-justify pres-arabic-justify'
                : 'text-justify pres-ltr-justify'
            : isRtl
              ? 'text-right'
              : 'text-left',
        extra
    );
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
        const measureRootRef = useRef<HTMLDivElement>(null);
        const [contentWidthPx, setContentWidthPx] = useState(0);

        const hasCopticScript = useMemo(() => linesHaveCopticScript(lines), [lines]);
        const columnMode: MultiColumnMode = resolveMultiColumnMode(hasCoptic, hasCopticScript);

        useLayoutEffect(() => {
            const el = measureRootRef.current;
            if (!el || typeof ResizeObserver === 'undefined') {
                return;
            }
            const apply = (w: number) => {
                if (w > 0) {
                    setContentWidthPx(Math.floor(w));
                }
            };
            apply(el.getBoundingClientRect().width);
            const ro = new ResizeObserver((entries) => {
                const w = entries[0]?.contentRect.width;
                apply(w ?? 0);
            });
            ro.observe(el);
            return () => ro.disconnect();
        }, []);

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

            const widthForMeasure = Math.max(
                280,
                contentWidthPx || (typeof window !== 'undefined' ? window.innerWidth - 64 : 960)
            );
            const tolerance = paginationTolerancePx(maxContentHeight);
            const paginator = new TextPaginator('slide-content-enter', fontSizePx, widthForMeasure);
            paginator.setContentWidth(widthForMeasure);

            const measureAdapter = {
                arabicParagraph: (t: string) => paginator.measureArabicParagraphHeight(t),
                dualRow: (ar: string, copAr: string) => paginator.measureDualColumnRowHeight(ar, copAr),
                tripleRow: (ar: string, copAr: string, cop: string) =>
                    paginator.measureTripleColumnRowHeight(ar, copAr, cop),
            };

            const computedPages = computeSlidePages(
                lines,
                columnMode,
                maxContentHeight,
                tolerance,
                fontSizePx,
                measureAdapter,
                (text, maxH) => paginator.paginate(text, maxH)
            );

            paginator.cleanup();
            const finalPages = computedPages.length > 0 ? computedPages : [lines];
            setPages(finalPages);
            emitMeta(0, finalPages);
        }, [lines, columnMode, maxContentHeight, fontSizePx, contentWidthPx, emitMeta]);

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
            if (!speaker) return '';
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

        const renderSpeakerBar = (currentSpeaker: string, compact: boolean) => (
            <div className={cn('flex w-full items-center', compact ? 'gap-2 my-1' : 'gap-2 my-1.5')}>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                <span
                    className={cn(
                        compact
                            ? 'pres-speaker-badge px-4 py-1 rounded-full font-bold border shadow-sm'
                            : 'pres-speaker-badge-lg px-5 py-1.5 rounded-xl font-black border shadow-sm transition-all',
                        getSpeakerStyles(currentSpeaker)
                    )}
                >
                    {currentSpeaker}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
            </div>
        );

        if (columnMode === 'single') {
            return (
                <div
                    ref={measureRootRef}
                    className={cn(
                        'flex h-full min-h-0 min-w-0 flex-1 flex-col items-stretch justify-start space-y-3 px-8 md:px-10',
                        className
                    )}
                >
                    {currentLines.map((line, index) => {
                        const prevSpeaker = index > 0 ? currentLines[index - 1].speaker : null;
                        const shouldShowSpeaker = line.speaker && line.speaker !== prevSpeaker;

                        return (
                            <div
                                key={`${currentPage}-${line.id}-${index}`}
                                className="animate-in fade-in slide-in-from-bottom-2 flex flex-col space-y-2 duration-500"
                            >
                                {shouldShowSpeaker && line.speaker && renderSpeakerBar(line.speaker, true)}
                                <p
                                    className={bodyParagraphClassNames(justified, 'text-foreground')}
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

        const isTriple = columnMode === 'triple';

        return (
            <div
                ref={measureRootRef}
                className={cn(
                    'flex h-full min-h-0 min-w-0 flex-1 flex-col items-stretch justify-start space-y-3 px-8 md:px-10',
                    className
                )}
            >
                {pairedLines.map(([ar, arcop, cop], index) => {
                    const showAr = hasText(ar);
                    const showArcop = hasText(arcop);
                    const showCop = hasText(cop);

                    const currentSpeaker = ar?.speaker || arcop?.speaker || cop?.speaker;

                    const previousLine = index > 0 ? pairedLines[index - 1] : null;
                    const previousSpeaker = previousLine
                        ? previousLine[0]?.speaker ||
                          previousLine[1]?.speaker ||
                          previousLine[2]?.speaker
                        : null;

                    const shouldShowSpeaker = currentSpeaker && currentSpeaker !== previousSpeaker;

                    if (!showAr && !showArcop && !showCop) {
                        return null;
                    }

                    const useThreeColLayout = isTriple && showCop;

                    return (
                        <div
                            key={`p${currentPage}-row-${index}`}
                            className="flex flex-col space-y-2"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {shouldShowSpeaker && currentSpeaker && renderSpeakerBar(currentSpeaker, false)}

                            <div
                                className={cn(
                                    'flex w-full flex-col items-stretch md:flex-row md:items-stretch',
                                    rowGapClass
                                )}
                            >
                                {showAr && ar && (
                                    <div
                                        className={cn(
                                            'min-w-0 shrink-0 basis-full',
                                            useThreeColLayout ? 'md:basis-[30%]' : 'md:basis-[40%]'
                                        )}
                                    >
                                        <p
                                            className={bodyParagraphClassNames(justified, 'text-foreground')}
                                            dir="rtl"
                                            dangerouslySetInnerHTML={lineHtml(ar, highlightQuery)}
                                        />
                                    </div>
                                )}

                                {showAr && (showArcop || (useThreeColLayout && showCop)) && (
                                    <div
                                        className="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25"
                                        aria-hidden="true"
                                    />
                                )}

                                {showArcop && arcop && (
                                    <div
                                        className={cn(
                                            'min-w-0 shrink-0 basis-full',
                                            useThreeColLayout ? 'md:basis-[35%]' : 'md:basis-[60%]'
                                        )}
                                    >
                                        <p
                                            className={bodyParagraphClassNames(
                                                justified,
                                                '!text-[#880808] dark:!text-sky-400 break-words'
                                            )}
                                            dir="rtl"
                                            dangerouslySetInnerHTML={lineHtml(arcop, highlightQuery)}
                                        />
                                    </div>
                                )}

                                {useThreeColLayout && (showAr || showArcop) && showCop && (
                                    <div
                                        className="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25"
                                        aria-hidden="true"
                                    />
                                )}

                                {useThreeColLayout && showCop && cop && (
                                    <div className="min-w-0 shrink-0 basis-full break-words md:basis-[35%]">
                                        <p
                                            className={bodyParagraphClassNames(
                                                justified,
                                                'text-foreground',
                                                false
                                            )}
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
    }
);

SplitViewReader.displayName = 'SplitViewReader';
