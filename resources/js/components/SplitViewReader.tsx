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

/**
 * Represents a single line of text in the liturgical content.
 */
export interface Line {
    /** Unique identifier for the line */
    id: number;
    /** Language type determining the script and directionality */
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    /** The actual text content to be displayed */
    text: string;
    /** The person or group speaking this line (e.g., Priest, People, Deacon) */
    speaker?: string;
    /** Liturgical intonation or chant instructions for the line */
    intonation?: string;
    /** Conclusion or response for the line */
    conclusion?: string;
}

/**
 * Represents a complete integrated row where all three language versions
 * (Arabic, Coptic Arabized, Coptic Script) are bound together.
 * This ensures that when pagination splits content, all three columns
 * are split at the same logical points.
 */
interface IntegratedRow {
    /** Unique identifier for the row */
    id: number;
    /** Arabic text line */
    arabic: Line;
    /** Coptic Arabized (pronunciation) text line */
    copticArabized: Line;
    /** Coptic Script text line (optional, may be empty) */
    copticScript: Line | null;
    /** Speaker name (same across all three) */
    speaker?: string;
    /** Whether this row has been split from a larger row */
    isSplit?: boolean;
    /** Original parent ID if this is a split segment */
    parentId?: number;
}

/**
 * Props for the SplitViewReader component.
 */
export interface SplitViewReaderProps {
    /** Array of lines to be paginated and displayed */
    lines: Line[];
    /** Whether the content contains Coptic script (affects layout modes) */
    hasCoptic: boolean;
    /** Optional CSS class names for the root container */
    className?: string;
    /** Whether to apply text justification (defaults to true) */
    justified?: boolean;
    /** Maximum available height for content before pagination occurs */
    maxContentHeight: number;
    /** Base font size in pixels for height calculations */
    fontSizePx: number;
    /** Search query string to highlight matching text */
    highlightQuery?: string;
    /** The initially active page index (defaults to 0) */
    initialPage?: number;
    /** Global intonation/intro text for the entire slide set */
    intonation?: string | null;
    /** Global conclusion text for the entire slide set */
    conclusion?: string | null;
    /** Whether to render in Chroma key mode (high contrast for broadcasting) */
    chromaMode?: boolean;
    /** Callback triggered whenever pagination metadata changes (e.g., page navigation) */
    onPaginationMetaChange?: (meta: {
        isFirstPage: boolean;
        isLastPage: boolean;
        pageCount: number;
        pageIndex: number;
    }) => void;
}

/**
 * Handle object exposed via forwardRef to control the reader's state.
 */
export interface SplitViewReaderRef {
    /** Navigates to the next page if available. Returns true if navigation occurred. */
    nextPage: () => boolean;
    /** Navigates to the previous page if available. Returns true if navigation occurred. */
    prevPage: () => boolean;
    /** Whether the current page is the first page */
    isFirstPage: boolean;
    /** Whether the current page is the last page */
    isLastPage: boolean;
    /** 0-based index of the currently active page */
    currentPageIndex: number;
    /** Total number of pages generated after pagination */
    totalPages: number;
    /** Flag used by parent components to decide if they should move to the next slide */
    canGoToNextSlide: boolean;
    /** Flag used by parent components to decide if they should move to the previous slide */
    canGoToPrevSlide: boolean;
}

/**
 * Groups lines into integrated rows where Arabic, Coptic Arabized, and Coptic Script
 * are bound together as a single unit. This prevents separation during pagination.
 *
 * The algorithm assumes the backend sends lines in the following order:
 * Arabic line 1, Coptic Arabized line 1, Coptic Script line 1,
 * Arabic line 2, Coptic Arabized line 2, Coptic Script line 2, ...
 *
 * @param lines - Flat array of lines from the backend
 * @returns Array of IntegratedRows that stay together during pagination
 */
function groupIntoIntegratedRows(lines: Line[]): IntegratedRow[] {
    const rows: IntegratedRow[] = [];
    let rowId = 0;

    // Separate lines by language type
    const arabicLines: Line[] = [];
    const arcopticLines: Line[] = [];
    const copticLines: Line[] = [];

    for (const line of lines) {
        if (line.lang_type === 'arabic') {
            arabicLines.push(line);
        } else if (line.lang_type === 'coptic_arabized') {
            arcopticLines.push(line);
        } else if (line.lang_type === 'coptic') {
            copticLines.push(line);
        }
    }

    // Determine the maximum number of rows across all language types
    const maxRows = Math.max(arabicLines.length, arcopticLines.length, copticLines.length);

    // Group lines by their index position (assuming they are in matching order)
    for (let i = 0; i < maxRows; i++) {
        const arabic = arabicLines[i] || null;
        const copticArabized = arcopticLines[i] || null;
        const copticScript = copticLines[i] || null;

        // Determine the speaker (use from Arabic if available, otherwise from Coptic Arabized)
        const speaker = arabic?.speaker || copticArabized?.speaker || copticScript?.speaker;

        // Only create a row if at least one language has content
        if (arabic || copticArabized || copticScript) {
            rows.push({
                id: rowId++,
                arabic: arabic || {
                    id: -1,
                    lang_type: 'arabic',
                    text: '',
                    speaker
                },
                copticArabized: copticArabized || {
                    id: -1,
                    lang_type: 'coptic_arabized',
                    text: '',
                    speaker
                },
                copticScript: copticScript || null,
                speaker,
            });
        }
    }

    return rows;
}

/**
 * Flattens integrated rows back into lines array for pagination.
 * Maintains the order: Arabic, then Coptic Arabized, then Coptic Script.
 *
 * @param rows - Array of integrated rows
 * @returns Flat array of lines in correct display order
 */
function flattenIntegratedRows(rows: IntegratedRow[]): Line[] {
    const result: Line[] = [];

    for (const row of rows) {
        result.push(row.arabic);
        result.push(row.copticArabized);
        if (row.copticScript) {
            result.push(row.copticScript);
        }
    }

    return result;
}

/**
 * Splits an integrated row into multiple rows when it exceeds max height.
 * This ensures that all three language columns are split at the same logical points.
 *
 * @param row - The integrated row to split
 * @param maxHeightPx - Maximum allowed height in pixels
 * @param measureAdapter - Adapter for measuring text height
 * @param paginator - TextPaginator instance for sentence-aware splitting
 * @returns Array of integrated rows split from the original
 */
function splitIntegratedRow(
    row: IntegratedRow,
    maxHeightPx: number,
    measureAdapter: any,
    paginator: TextPaginator
): IntegratedRow[] {
    const arabicText = row.arabic.text;
    const copticArabizedText = row.copticArabized.text;
    const copticScriptText = row.copticScript?.text || '';

    const hasCopticScript = copticScriptText.trim().length > 0;

    // If the row is already small enough, return as is
    const rowHeight = hasCopticScript
        ? measureAdapter.tripleRow(arabicText, copticArabizedText, copticScriptText)
        : measureAdapter.dualRow(arabicText, copticArabizedText);

    if (rowHeight <= maxHeightPx) {
        return [row];
    }

    // Split the Arabic text into sentence-aware chunks
    const arabicChunks = paginator.paginate(arabicText, maxHeightPx);

    if (arabicChunks.length <= 1) {
        // Cannot split further, return as is
        return [row];
    }

    // Split the Coptic Arabized text into same number of chunks
    const copticArabizedChunks = paginator.paginate(copticArabizedText, maxHeightPx);
    const copticScriptChunks = hasCopticScript
        ? paginator.paginate(copticScriptText, maxHeightPx)
        : [];

    // Ensure all chunks arrays have the same length
    const targetChunks = Math.max(arabicChunks.length, copticArabizedChunks.length, copticScriptChunks.length);

    // Pad shorter arrays with empty strings
    const padArray = (arr: string[], len: number): string[] => {
        const padded = [...arr];
        while (padded.length < len) padded.push('');
        return padded;
    };

    const paddedArabicChunks = padArray(arabicChunks, targetChunks);
    const paddedCopticArabizedChunks = padArray(copticArabizedChunks, targetChunks);
    const paddedCopticScriptChunks = padArray(copticScriptChunks, targetChunks);

    // Create new integrated rows from the chunks
    const splitRows: IntegratedRow[] = [];

    for (let i = 0; i < targetChunks; i++) {
        splitRows.push({
            id: row.id * 10000 + i,
            arabic: { ...row.arabic, text: paddedArabicChunks[i] },
            copticArabized: { ...row.copticArabized, text: paddedCopticArabizedChunks[i] },
            copticScript: row.copticScript ? { ...row.copticScript, text: paddedCopticScriptChunks[i] } : null,
            speaker: row.speaker,
            isSplit: true,
            parentId: row.id,
        });
    }

    return splitRows;
}

/**
 * Processes line text for HTML rendering, escaping special characters
 * and applying search highlights if a query is provided.
 *
 * @param line The line object containing text
 * @param highlightQuery Optional query string to highlight
 * @returns Object with sanitised and highlighted HTML content
 */
function lineHtml(line: Line, highlightQuery: string | undefined): { __html: string } {
    const raw = line.text ?? '';
    // If no search query, perform standard HTML escaping
    if (!highlightQuery?.trim()) {
        return { __html: raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') };
    }
    // Highlight matches using the SearchService
    return { __html: SearchService.highlightMatch(highlightQuery, raw) };
}

const rowGapClass = 'gap-3 md:gap-4';

/**
 * Generates Tailwind CSS class names for body paragraphs based on layout state.
 *
 * @param justified Whether text should be justified
 * @param extra Additional custom classes
 * @param isRtl Whether the text direction is Right-to-Left
 * @param isCopticScript Whether the text is native Coptic script
 * @param isChroma Whether chroma mode is active (affects color)
 * @returns Combined class string
 */
function bodyParagraphClassNames(
    justified: boolean,
    extra?: string,
    isRtl: boolean = true,
    isCopticScript: boolean = false,
    isChroma: boolean = false
): string {
    return cn(
        'pres-slide-body-text font-bold break-words text-center',
        // Use different fonts and directionality settings based on script type
        isCopticScript ? 'pres-coptic-text' : 'font-reading pres-arabic-text',
        PRES_BODY_LEADING_CLASS,
        isChroma && 'text-white',
        extra
    );
}

/**
 * Calculates the effective text length for column width distribution.
 * Ignores spaces, punctuation, and kashida characters to focus on actual content.
 *
 * @param text The text to measure
 * @returns Effective character count for width calculation
 */
function getEffectiveTextLength(text: string): number {
    if (!text) return 0;
    // Remove spaces, punctuation, and kashida (tatweel) characters
    // This ensures column width is based on meaningful content only
    return text.replace(/[\s\u0640\u061F\u060C\u061B\u061E\u066A-\u066D\u06D4]+/g, '').length;
}

/**
 * Calculates dynamic column width ratios based on actual content length.
 *
 * @param texts Array of text strings for each column (1-3 columns)
 * @returns Array of ratios that sum to 1 (e.g., [0.4, 0.6] for two columns)
 */
function calculateDynamicRatios(texts: string[]): number[] {
    // Filter out empty texts
    const validTexts = texts.filter(t => t && t.trim().length > 0);
    const columnCount = validTexts.length;

    // If only one column has content, it takes 100% width
    if (columnCount === 1) {
        return texts.map(t => (t && t.trim().length > 0 ? 1 : 0));
    }

    // Calculate effective lengths for all columns
    const lengths = texts.map(t => getEffectiveTextLength(t || ''));
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);

    if (totalLength === 0) {
        // Fallback to equal distribution if no measurable content
        return texts.map(() => 1 / texts.length);
    }

    // Calculate initial ratios based on content length
    let ratios = lengths.map(len => len / totalLength);

    // Apply constraints to avoid extreme ratios
    const minRatio = 0.20; // Minimum 20% width for any column with content
    const maxRatio = 0.80; // Maximum 80% width for any single column

    // Apply minimum constraints
    let adjusted = ratios.map(r => Math.max(minRatio, Math.min(maxRatio, r)));

    // Renormalize to sum to 1
    const sum = adjusted.reduce((a, b) => a + b, 0);
    if (sum > 0) {
        adjusted = adjusted.map(r => r / sum);
    }

    return adjusted;
}

/**
 * SplitViewReader Component
 *
 * A specialized liturgical reader that takes a set of text lines and paginates them
 * dynamically to fit within a specific height. It supports single, dual, and triple
 * column layouts with DYNAMIC column widths based on actual content length.
 *
 * Integrated rows ensure that Arabic, Coptic Arabized, and Coptic Script texts
 * stay together as a single unit during pagination.
 */
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
            initialPage = 0,
            intonation,
            conclusion,
            chromaMode = false,
            onPaginationMetaChange,
        },
        ref
    ) => {
        // Track the current page index within the split content
        const [currentPage, setCurrentPage] = useState(initialPage);
        // Stores the lines grouped into pages after pagination logic runs
        const [pages, setPages] = useState<Line[][]>(lines?.length ? [lines] : []);
        // Reference to the root element for dynamic width measurement
        const measureRootRef = useRef<HTMLDivElement>(null);
        // Current width of the container, used to calculate line breaks during pagination
        const [contentWidthPx, setContentWidthPx] = useState(0);

        // Store integrated rows for rendering (ensures Arabic + Coptic Arabized + Coptic stay together)
        const [integratedRows, setIntegratedRows] = useState<IntegratedRow[]>([]);

        // Detect if Coptic script characters are present in the text
        const hasCopticScript = useMemo(() => linesHaveCopticScript(lines ?? []), [lines]);
        // Determine the column layout mode (single, dual, triple)
        const columnMode: MultiColumnMode = resolveMultiColumnMode(hasCoptic ?? false, hasCopticScript);

        // Check if we're in multi-column mode (dual or triple)
        const isMultiColumn = columnMode === 'dual' || columnMode === 'triple';

        /**
         * Group lines into integrated rows whenever the input lines change.
         * This is the foundation for keeping all language versions together.
         */
        useEffect(() => {
            if (!lines || lines.length === 0) {
                setIntegratedRows([]);
                return;
            }

            const rows = groupIntoIntegratedRows(lines);
            setIntegratedRows(rows);
        }, [lines]);

        /**
         * Cache for dynamic column ratios for the current page.
         * Recalculated whenever the current page content changes.
         */
        const [dynamicRatios, setDynamicRatios] = useState<number[]>([]);

        /**
         * Calculate dynamic column ratios whenever the current page content changes.
         * This ensures each page has optimal column widths based on its actual content.
         */
        useEffect(() => {
            const currentLinesList = pages[currentPage] || [];
            if (!currentLinesList.length || columnMode === 'single') {
                // Single column mode always uses 100% width
                setDynamicRatios([1]);
                return;
            }

            // Extract texts from each column based on available content
            const arabicTexts = currentLinesList.filter(l => l.lang_type === 'arabic').map(l => l.text);
            const arcopticTexts = currentLinesList.filter(l => l.lang_type === 'coptic_arabized').map(l => l.text);
            const copticTexts = currentLinesList.filter(l => l.lang_type === 'coptic').map(l => l.text);

            // Combine all texts in each column for ratio calculation
            const combinedArabic = arabicTexts.join(' ');
            const combinedArcoptic = arcopticTexts.join(' ');
            const combinedCoptic = copticTexts.join(' ');

            const isTriple = columnMode === 'triple' && combinedCoptic.trim().length > 0;
            const isDual = columnMode === 'dual' || (columnMode === 'triple' && !isTriple);

            if (isTriple) {
                // Three columns: calculate ratios for all three
                const ratios = calculateDynamicRatios([combinedArabic, combinedArcoptic, combinedCoptic]);
                setDynamicRatios(ratios);
            } else if (isDual) {
                // Two columns: calculate ratios for Arabic and Coptic Arabized
                const ratios = calculateDynamicRatios([combinedArabic, combinedArcoptic]);
                // Ensure we have exactly 2 ratios (pad with 0 if needed)
                setDynamicRatios(ratios.length >= 2 ? [ratios[0], ratios[1]] : [0.5, 0.5]);
            } else {
                // Single column fallback
                setDynamicRatios([1]);
            }
        }, [pages, currentPage, columnMode]);

        /**
         * Use ResizeObserver to keep track of the container's width.
         * This is critical because pagination results depend on the available width for text.
         */
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
            if (initialPage !== undefined && initialPage !== currentPage) {
                setCurrentPage(initialPage);
            }
        }, [initialPage]);

        /**
         * The core pagination effect. Triggered whenever the content (lines),
         * layout constraints (maxHeight, fontSize), or container width change.
         *
         * Uses integrated rows to ensure all language versions stay together.
         */
        useEffect(() => {
            setCurrentPage(0);

            if (!lines || lines.length === 0) {
                setPages([]);
                emitMeta(0, []);
                return;
            }

            // Calculate the width for measurement, falling back to window width if necessary
            const widthForMeasure = Math.max(
                280,
                contentWidthPx || (typeof window !== 'undefined' ? window.innerWidth - 64 : 960)
            );

            // Apply a small tolerance to the height to avoid strictly cutting off lines
            const tolerance = paginationTolerancePx(maxContentHeight);

            // Initialise the paginator which uses a hidden DOM sandbox for height measurement
            const paginator = new TextPaginator('slide-content-enter', fontSizePx, widthForMeasure);
            paginator.setContentWidth(widthForMeasure);

            /**
             * Adapter to bridge the generic computeSlidePages logic with the
             * DOM-based height measurements provided by TextPaginator.
             */
            const measureAdapter = {
                arabicParagraph: (t: string) => paginator.measureArabicParagraphHeight(t),
                dualRow: (ar: string, copAr: string) => paginator.measureFullRowHeight(ar, copAr, '', false),
                tripleRow: (ar: string, copAr: string, cop: string) => paginator.measureFullRowHeight(ar, copAr, cop, true),
                fullRowHeight: (ar: string, copAr: string, cop: string, triple: boolean) =>
                    paginator.measureFullRowHeight(ar, copAr, cop, triple),
                measureRowWithRatios: (ar: string, copAr: string, cop: string, triple: boolean, ratios: number[]) =>
                    paginator.measureRowWithRatios(ar, copAr, cop, triple, ratios),
                findBalancedRatios: (ar: string, copAr: string, cop: string, triple: boolean) =>
                    paginator.findBalancedRatios(ar, copAr, cop, triple),
                splitFullRowSynchronizedWithRatios: (
                    ar: string, copAr: string, cop: string, triple: boolean, maxH: number, ratios: number[]
                ) => paginator.splitFullRowSynchronizedWithRatios(ar, copAr, cop, triple, maxH, ratios),
            };

            // For multi-column mode, we need to work with integrated rows to ensure
            // all language versions stay together during pagination
            let linesForPagination: Line[];

            if (isMultiColumn && integratedRows.length > 0) {
                // First, check if any integrated row needs splitting
                let processedRows: IntegratedRow[] = [];

                for (const row of integratedRows) {
                    const rowHasContent = row.arabic.text.trim() || row.copticArabized.text.trim() || (row.copticScript?.text || '').trim();
                    if (!rowHasContent) continue;

                    // Check if this row needs to be split
                    const rowHeight = columnMode === 'triple' && row.copticScript?.text?.trim()
                        ? measureAdapter.tripleRow(row.arabic.text, row.copticArabized.text, row.copticScript.text || '')
                        : measureAdapter.dualRow(row.arabic.text, row.copticArabized.text);

                    if (rowHeight > maxContentHeight - 100) { // Leave some buffer
                        // Split the row using sentence-aware splitting
                        const splitRows = splitIntegratedRow(row, maxContentHeight - 100, measureAdapter, paginator);
                        processedRows.push(...splitRows);
                    } else {
                        processedRows.push(row);
                    }
                }

                // Flatten the processed rows for pagination
                linesForPagination = flattenIntegratedRows(processedRows);
            } else {
                linesForPagination = lines;
            }

            // Recursively split lines into pages that fit the maxContentHeight
            const computedPages = computeSlidePages(
                linesForPagination,
                columnMode,
                maxContentHeight,
                tolerance,
                fontSizePx,
                measureAdapter,
                (text, maxH) => paginator.paginate(text, maxH)
            );

            // Important: Clean up the measurement sandbox element from the document body
            paginator.cleanup();
            const finalPages = computedPages.length > 0 ? computedPages : [linesForPagination];
            setPages(finalPages);
            emitMeta(0, finalPages);
        }, [lines, integratedRows, columnMode, isMultiColumn, maxContentHeight, fontSizePx, contentWidthPx, emitMeta]);

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
                currentPageIndex: currentPage,
                totalPages: pages.length,
                canGoToNextSlide: pages.length > 0 && currentPage === pages.length - 1,
                canGoToPrevSlide: currentPage === 0,
            }),
            [currentPage, pages.length]
        );

        const currentLines = pages[currentPage] || [];
        const isLastPage = pages.length === 0 || currentPage === pages.length - 1;

        /**
         * Determines the color and background styles for different speakers.
         *
         * @param speaker The speaker name
         * @returns CSS class string
         */
        const getSpeakerStyles = (speaker?: string) => {
            if (!speaker) return '';
            const s = speaker.trim();
            if (s.includes('الكاهن')) { // Priest
                return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
            }
            if (s.includes('الشعب')) { // People/Congregation
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
            }
            if (s.includes('الشماس')) { // Deacon
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
            }
            return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        };

        const hasText = (obj: Line | null | undefined) => obj && obj.text && obj.text.trim().length > 0;

        /**
         * Renders the speaker badge bar, optimized for different layout modes.
         * The speaker is ALWAYS displayed above the text for better readability.
         *
         * @param currentSpeaker The name of the current speaker
         * @param compact Whether to use a more compact vertical margin
         */
        const renderSpeakerBar = (currentSpeaker: string, compact: boolean) => {
            const isDual = columnMode === 'dual';

            const badgeClasses = cn(
                'pres-speaker-badge-lg px-5 py-1.5 rounded-xl font-black border shadow-sm transition-all',
                getSpeakerStyles(currentSpeaker)
            );

            if (isDual) {
                const ratioAr = dynamicRatios[0] ? `${Math.round(dynamicRatios[0] * 100)}` : '42';
                const ratioCopAr = dynamicRatios[1] ? `${Math.round(dynamicRatios[1] * 100)}` : '58';

                return (
                    <div
                        className={cn(
                            'flex w-full items-center',
                            compact ? 'my-1' : 'my-1.5',
                            'gap-4'
                        )}
                    >
                        <div
                            className="hidden md:flex items-center"
                            style={{ flex: ratioAr }}
                        >
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                        </div>

                        <div className="w-full md:w-px flex-shrink-0 flex items-center justify-center overflow-visible z-10">
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30 md:hidden" />
                            <div className="relative isolate group">
                                <div className="absolute inset-0 bg-white dark:bg-[#020617] rounded-xl -z-10" />
                                <span className={badgeClasses}>
                                    {currentSpeaker}
                                </span>
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30 md:hidden" />
                        </div>

                        <div
                            className="hidden md:flex items-center"
                            style={{ flex: ratioCopAr }}
                        >
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                        </div>
                    </div>
                );
            }

            return (
                <div className={cn('flex w-full items-center', compact ? 'gap-2 my-1' : 'gap-2 my-1.5')}>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                    <div className="relative isolate group">
                        <div className="absolute inset-0 bg-white dark:bg-[#020617] rounded-xl -z-10" />
                        <span className={badgeClasses}>
                            {currentSpeaker}
                        </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                </div>
            );
        };

        /**
         * Gets inline style object for dynamic column width.
         *
         * @param columnIndex Index of the column (0, 1, or 2)
         * @returns React.CSSProperties object with flex-basis set
         */
        const getColumnWidthStyle = (columnIndex: number): React.CSSProperties => {
            if (dynamicRatios.length <= columnIndex) return {};
            const ratio = dynamicRatios[columnIndex];
            if (ratio === 1) return { flexBasis: '100%' };
            if (ratio <= 0) return { display: 'none' };
            return { flexBasis: `${ratio * 100}%` };
        };

        // Single column mode: display each line sequentially with speaker above
        if (columnMode === 'single') {
            // Group single column lines by speaker to show speaker bar only once per speaker block
            const groupedBySpeaker: { speaker: string | null; lines: Line[] }[] = [];
            let currentGroup: { speaker: string | null; lines: Line[] } | null = null;

            for (const line of currentLines) {
                const lineSpeaker = line.speaker || null;
                if (!currentGroup || currentGroup.speaker !== lineSpeaker) {
                    if (currentGroup) groupedBySpeaker.push(currentGroup);
                    currentGroup = { speaker: lineSpeaker, lines: [line] };
                } else {
                    currentGroup.lines.push(line);
                }
            }
            if (currentGroup) groupedBySpeaker.push(currentGroup);

            return (
                <div
                    ref={measureRootRef}
                    className={cn(
                        'flex h-full min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center space-y-3 px-8 md:px-10',
                        className
                    )}
                >
                    {/* Intonation section — only visible on the first page of the slide set */}
                    {intonation && currentPage === 0 && (
                        <div className="flex w-full items-center gap-2 my-1.5">
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                            <span className="pres-intonation-scale px-5 py-1.5 rounded-xl font-black border shadow-sm bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                                {intonation}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                        </div>
                    )}

                    {groupedBySpeaker.map((group, groupIdx) => (
                        <div key={`group-${groupIdx}`} className="flex flex-col space-y-2">
                            {/* Speaker bar appears above the first line of each speaker group */}
                            {group.speaker && !chromaMode && renderSpeakerBar(group.speaker, true)}

                            {group.lines.map((line, lineIdx) => {
                                const isCopticScript = line.lang_type === 'coptic';
                                return (
                                    <p
                                        key={`${currentPage}-${line.id}-${lineIdx}`}
                                        className={bodyParagraphClassNames(
                                            justified,
                                            chromaMode ? 'text-white' : 'text-foreground',
                                            true,
                                            isCopticScript,
                                            chromaMode
                                        )}
                                        dir={isCopticScript ? 'ltr' : 'rtl'}
                                        dangerouslySetInnerHTML={lineHtml(line, highlightQuery)}
                                    />
                                );
                            })}
                        </div>
                    ))}

                    {/* Conclusion section — only visible on the last page of the slide set */}
                    {conclusion && isLastPage && (
                        <div className="flex w-full items-center gap-2 my-1.5">
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                            <span className="pres-conclusion-scale px-5 py-1.5 rounded-xl font-black border shadow-sm bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                                {conclusion}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                        </div>
                    )}
                </div>
            );
        }

        // Multi-column mode (dual or triple)
        // Group currentLines into integrated rows for rendering
        // NOTE: These useMemo hooks are AFTER the single-column return, but that's safe
        // because columnMode is stable per-render — it never changes mid-render.
        // However, to be 100% safe against React strict mode and future refactors,
        // we keep them here since they are only used by multi-column rendering.
        const currentIntegratedRows = groupIntoIntegratedRows(currentLines);

        const isTriple = columnMode === 'triple';

        // Group rows by speaker for proper gap spacing:
        // Gap only between distinct speaker groups, not between every row.
        const speakerGroupsArr: { speaker: string | undefined; rows: IntegratedRow[] }[] = [];
        {
            let currentGrp: { speaker: string | undefined; rows: IntegratedRow[] } | null = null;
            for (const row of currentIntegratedRows) {
                const sp = row.speaker;
                if (!currentGrp || currentGrp.speaker !== sp) {
                    if (currentGrp) speakerGroupsArr.push(currentGrp);
                    currentGrp = { speaker: sp, rows: [row] };
                } else {
                    currentGrp.rows.push(row);
                }
            }
            if (currentGrp) speakerGroupsArr.push(currentGrp);
        }

        return (
            <div
                ref={measureRootRef}
                className={cn(
                    'flex h-full min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center px-8 md:px-10',
                    className
                )}
            >
                {/* Intonation section — only visible on the first page of the multi-column layout */}
                {intonation && currentPage === 0 && (
                    <div className="flex w-full items-center gap-2 my-1.5">
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                        <span className="pres-intonation-scale px-5 py-1.5 rounded-xl font-black border shadow-sm bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                            {intonation}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                    </div>
                )}

                {speakerGroupsArr.map((group: { speaker: string | undefined; rows: IntegratedRow[] }, groupIdx: number) => {
                    const groupSpeaker = group.speaker;
                    const prevGroup = groupIdx > 0 ? speakerGroupsArr[groupIdx - 1] : null;
                    const shouldShowSpeaker = groupSpeaker && groupSpeaker !== prevGroup?.speaker;

                    return (
                        <div
                            key={`p${currentPage}-grp-${groupIdx}`}
                            className={cn('flex flex-col', groupIdx > 0 ? 'mt-3' : '')}
                        >
                            {/* Speaker bar appears once above the entire speaker group */}
                            {shouldShowSpeaker && groupSpeaker && !chromaMode && renderSpeakerBar(groupSpeaker, false)}

                            {/* Column-based layout: columns hold all rows, dividers span full height */}
                            <div className="flex w-full items-stretch gap-4">
                                {/* Arabic column — all rows stacked */}
                                <div
                                    className="flex min-w-0 flex-col"
                                    style={{ flex: dynamicRatios[0] ? `${Math.round(dynamicRatios[0] * 100)}` : '42' }}
                                >
                                    {group.rows.map((row: IntegratedRow, rowIdx: number) => {
                                        if (!hasText(row.arabic)) {
                                            return <div key={`ar-empty-${rowIdx}`} className="min-h-[1em]" />;
                                        }
                                        return (
                                            <p
                                                key={`ar-${row.id}-${rowIdx}`}
                                                className={bodyParagraphClassNames(
                                                    justified,
                                                    chromaMode ? 'text-white' : 'text-foreground',
                                                    true,
                                                    false,
                                                    chromaMode
                                                )}
                                                dir="rtl"
                                                dangerouslySetInnerHTML={lineHtml(row.arabic, highlightQuery)}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Single continuous divider between Arabic and Coptic Arabized */}
                                <div
                                    className="w-px flex-shrink-0 self-stretch bg-black/20 dark:bg-white/20"
                                    aria-hidden="true"
                                />

                                {/* Coptic Arabized column — all rows stacked */}
                                <div
                                    className="flex min-w-0 flex-col"
                                    style={{ flex: dynamicRatios[1] ? `${Math.round(dynamicRatios[1] * 100)}` : '58' }}
                                >
                                    {group.rows.map((row: IntegratedRow, rowIdx: number) => {
                                        if (!hasText(row.copticArabized)) {
                                            return <div key={`arcop-empty-${rowIdx}`} className="min-h-[1em]" />;
                                        }
                                        return (
                                            <p
                                                key={`arcop-${row.id}-${rowIdx}`}
                                                className={bodyParagraphClassNames(
                                                    justified,
                                                    chromaMode
                                                        ? 'text-white/90'
                                                        : '!text-[#880808] dark:!text-sky-400 break-words',
                                                    true,
                                                    false,
                                                    chromaMode
                                                )}
                                                dir="rtl"
                                                dangerouslySetInnerHTML={lineHtml(row.copticArabized, highlightQuery)}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Triple column: second divider + Coptic Script column */}
                                {isTriple && (
                                    <>
                                        <div
                                            className="w-px flex-shrink-0 self-stretch bg-black/20 dark:bg-white/20"
                                            aria-hidden="true"
                                        />
                                        <div
                                            className="flex min-w-0 flex-col"
                                            style={{ flex: dynamicRatios[2] ? `${Math.round(dynamicRatios[2] * 100)}` : '40' }}
                                        >
                                            {group.rows.map((row: IntegratedRow, rowIdx: number) => {
                                                if (!hasText(row.copticScript)) {
                                                    return <div key={`cop-empty-${rowIdx}`} className="min-h-[1em]" />;
                                                }
                                                return (
                                                    <p
                                                        key={`cop-${row.id}-${rowIdx}`}
                                                        className={bodyParagraphClassNames(
                                                            justified,
                                                            chromaMode ? 'text-white/80' : 'text-foreground',
                                                            false,
                                                            true,
                                                            chromaMode
                                                        )}
                                                        dir="ltr"
                                                        dangerouslySetInnerHTML={lineHtml(row.copticScript!, highlightQuery)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Conclusion section — only visible on the last page of the multi-column layout */}
                {conclusion && isLastPage && (
                    <div className="flex w-full items-center gap-2 my-1.5">
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/30" />
                        <span className="pres-conclusion-scale px-5 py-1.5 rounded-xl font-black border shadow-sm bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                            {conclusion}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/30" />
                    </div>
                )}
            </div>
        );
    }
);

SplitViewReader.displayName = 'SplitViewReader';
