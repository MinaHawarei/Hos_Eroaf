import {
    type MultiColumnMode,
    PRES_ROW_BLOCK_STACK_GAP_PX,
    paginationOverflowCeiling,
    paginationVerticalReservePx,
    speakerBlockExtraPx,
} from '@/utils/presentationLayout';

/**
 * Represents a single line of text that can be paginated.
 */
export interface PaginatableLine {
    /** Unique identifier for the line within its source */
    id: number;
    /** The script/language of the line */
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    /** The actual text content */
    text: string;
    /** Optional speaker identifier (e.g., 'Priest', 'People') to trigger styling/gaps */
    speaker?: string;
}

/**
 * Represents a single row of text across multiple language columns.
 */
export interface MultiColumnRowSegment {
    /** Arabic text for this row segment */
    ar: string;
    /** Coptic-Arabized text for this row segment */
    copAr: string;
    /** Native Coptic text for this row segment */
    cop: string;
}

/**
 * Represents a fully integrated row where all three language versions are bound together.
 * This is the atomic unit for pagination - rows never break apart.
 */
export interface IntegratedRow {
    /** Unique identifier for the row */
    id: number | string;
    /** Arabic text line */
    arabic: PaginatableLine;
    /** Coptic Arabized text line */
    copticArabized: PaginatableLine;
    /** Coptic Script text line (optional) */
    copticScript: PaginatableLine | null;
    /** Speaker name (same across all three) */
    speaker?: string;
    /** Whether this row has been split from a larger row */
    isSplit?: boolean;
    /** Original parent ID if this is a split segment */
    parentId?: number | string;
}

/**
 * Interface for the measurement engine (usually TextPaginator).
 * Decouples the pagination logic from the DOM-based measurement implementation.
 */
export interface SlideMeasureAdapter {
    /** Measures a single paragraph of Arabic text */
    arabicParagraph: (text: string) => number;
    /** Measures a 2-column row */
    dualRow: (ar: string, copAr: string) => number;
    /** Measures a 3-column row */
    tripleRow: (ar: string, copAr: string, cop: string) => number;
    /** Measures a full row height with standard column widths */
    fullRowHeight: (ar: string, copAr: string, cop: string, triple: boolean) => number;
    /** Measures a row using custom column width ratios */
    measureRowWithRatios: (ar: string, copAr: string, cop: string, triple: boolean, ratios: number[]) => number;
    /** Finds optimal column ratios to balance the vertical height of a row */
    findBalancedRatios: (ar: string, copAr: string, cop: string, triple: boolean) => number[];
    /** Splits a long row into multiple sub-segments that fit within a height limit */
    splitFullRowSynchronizedWithRatios: (
        ar: string,
        copAr: string,
        cop: string,
        triple: boolean,
        maxHeightPx: number,
        ratios: number[]
    ) => MultiColumnRowSegment[];
}

/**
 * Converts an IntegratedRow back into a flat array of PaginatableLines for rendering.
 * Maintains the order: Arabic, then Coptic Arabized, then Coptic Script.
 *
 * @param row - The integrated row to flatten
 * @returns Flat array of lines in correct display order
 */
export function flattenIntegratedRow(row: IntegratedRow): PaginatableLine[] {
    const result: PaginatableLine[] = [];
    result.push(row.arabic);
    result.push(row.copticArabized);
    if (row.copticScript) {
        result.push(row.copticScript);
    }
    return result;
}

/**
 * Flattens an array of IntegratedRows into a flat array of PaginatableLines.
 *
 * @param rows - Array of integrated rows
 * @returns Flat array of lines in correct display order
 */
export function flattenIntegratedRows(rows: IntegratedRow[]): PaginatableLine[] {
    const result: PaginatableLine[] = [];
    for (const row of rows) {
        result.push(...flattenIntegratedRow(row));
    }
    return result;
}

/**
 * Groups flat PaginatableLines into IntegratedRows based on language type order.
 * Assumes lines arrive in order: Arabic, Coptic Arabized, Coptic Script, repeating.
 *
 * @param lines - Flat array of lines
 * @returns Array of integrated rows
 */
export function groupIntoIntegratedRows(lines: PaginatableLine[]): IntegratedRow[] {
    const rows: IntegratedRow[] = [];
    let rowId = 0;

    // Separate lines by language type
    const arabicLines: PaginatableLine[] = [];
    const arcopticLines: PaginatableLine[] = [];
    const copticLines: PaginatableLine[] = [];

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
 * Groups lines from different language lists into a single synchronized row.
 * Used for legacy pagination.
 */
function linesForRow(
    index: number,
    arabicLines: PaginatableLine[],
    arcopticLines: PaginatableLine[],
    copticLines: PaginatableLine[],
    triple: boolean
): PaginatableLine[] {
    const chunk: PaginatableLine[] = [];
    const ar = arabicLines[index];
    const copAr = arcopticLines[index];
    const cop = copticLines[index];
    if (ar) chunk.push(ar);
    if (copAr) chunk.push(copAr);
    if (triple && cop) chunk.push(cop);
    return chunk;
}

/**
 * Converts a MultiColumnRowSegment (raw text) back into PaginatableLine objects.
 * Maintains the metadata (id, speaker) from the original source lines.
 */
function linesFromSplitSegment(
    ar: PaginatableLine | undefined,
    copAr: PaginatableLine | undefined,
    cop: PaginatableLine | undefined,
    seg: MultiColumnRowSegment,
    triple: boolean
): PaginatableLine[] {
    const chunk: PaginatableLine[] = [];
    if (ar && seg.ar.trim().length > 0) chunk.push({ ...ar, text: seg.ar });
    if (copAr && seg.copAr.trim().length > 0) chunk.push({ ...copAr, text: seg.copAr });
    if (triple && cop && seg.cop.trim().length > 0) chunk.push({ ...cop, text: seg.cop });
    return chunk;
}

/** Removes speaker labels from lines (used for middle segments of split rows) */
function stripSpeakers(lines: PaginatableLine[]): PaginatableLine[] {
    return lines.map((l) => ({ ...l, speaker: undefined }));
}

/**
 * Paginates a list of IntegratedRows directly, preserving row integrity.
 * This is the preferred method for multi-column layouts as it ensures
 * Arabic, Coptic Arabized, and Coptic Script texts stay together.
 *
 * @param rows - Array of integrated rows to paginate
 * @param triple - Whether this is triple-column mode
 * @param budgetPx - Target height budget per page
 * @param ceiling - Absolute maximum height before page break
 * @param speakerExtra - Extra height for speaker transitions
 * @param measure - Measurement adapter
 * @returns Array of pages, each containing flat lines
 */
export function paginateIntegratedRows(
    rows: IntegratedRow[],
    triple: boolean,
    budgetPx: number,
    ceiling: number,
    speakerExtra: number,
    measure: SlideMeasureAdapter
): PaginatableLine[][] {
    const pages: PaginatableLine[][] = [];
    let currentPageRows: IntegratedRow[] = [];
    let currentHeight = 0;
    let i = 0;

    // Cache for row ratios
    const rowRatios = new Map<number, number[]>();

    // Calculate height for a single integrated row
    const getRowHeight = (row: IntegratedRow, rowIndex: number): number => {
        const arT = row.arabic.text ?? '';
        const copArT = row.copticArabized.text ?? '';
        const copT = row.copticScript?.text ?? '';

        if (!rowRatios.has(rowIndex)) {
            const ratios = measure.findBalancedRatios(arT, copArT, copT, triple);
            rowRatios.set(rowIndex, ratios);
        }

        const ratios = rowRatios.get(rowIndex)!;
        const textH = measure.measureRowWithRatios(arT, copArT, copT, triple, ratios);

        // Check if speaker changed from previous row
        const prevRow = i > 0 ? rows[i - 1] : null;
        const speakerChanged = Boolean(row.speaker && row.speaker !== prevRow?.speaker && i > 0);

        return textH + (speakerChanged ? speakerExtra : 0);
    };

    while (i < rows.length) {
        const row = rows[i];
        const cost = getRowHeight(row, i);
        const gapBeforeRow = currentPageRows.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
        const totalWithGap = currentHeight + gapBeforeRow + cost;

        // Check if this row is too tall and needs to be split
        if (cost > budgetPx) {
            // Flush current page if not empty
            if (currentPageRows.length > 0) {
                pages.push(flattenIntegratedRows(currentPageRows));
                currentPageRows = [];
                currentHeight = 0;
            }

            // Split the oversized row into multiple integrated rows
            const arT = row.arabic.text ?? '';
            const copArT = row.copticArabized.text ?? '';
            const copT = row.copticScript?.text ?? '';

            const ratios = rowRatios.get(i) || measure.findBalancedRatios(arT, copArT, copT, triple);

            const segments = measure.splitFullRowSynchronizedWithRatios(
                arT, copArT, copT, triple, budgetPx, ratios
            );

            // Create new integrated rows from segments
            for (let segIdx = 0; segIdx < segments.length; segIdx++) {
                const seg = segments[segIdx];
                const newRow: IntegratedRow = {
                    id: `${row.id}_${segIdx}`,
                    arabic: { ...row.arabic, text: seg.ar },
                    copticArabized: { ...row.copticArabized, text: seg.copAr },
                    copticScript: row.copticScript ? { ...row.copticScript, text: seg.cop } : null,
                    speaker: row.speaker,
                    isSplit: true,
                    parentId: row.id,
                };

                const segCost = measure.measureRowWithRatios(seg.ar, seg.copAr, seg.cop, triple, ratios);

                if (currentHeight + segCost > ceiling && currentPageRows.length > 0) {
                    pages.push(flattenIntegratedRows(currentPageRows));
                    currentPageRows = [];
                    currentHeight = 0;
                }

                const pushGap = currentPageRows.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
                currentPageRows.push(newRow);
                currentHeight += pushGap + segCost;
            }

            i++;
            continue;
        }

        // Normal case: row fits or needs page break
        if (totalWithGap > ceiling && currentPageRows.length > 0) {
            // Save current page and start a new one
            pages.push(flattenIntegratedRows(currentPageRows));
            currentPageRows = [];
            currentHeight = 0;

            // Add current row to new page
            currentPageRows.push(row);
            currentHeight = cost;
        } else {
            // Add row to current page
            const pushGap = currentPageRows.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
            currentPageRows.push(row);
            currentHeight += pushGap + cost;
        }

        i++;
    }

    // Add the last page if it has content
    if (currentPageRows.length > 0) {
        pages.push(flattenIntegratedRows(currentPageRows));
    }

    return pages;
}

/**
 * Paginates a single-column list of lines.
 * Handles paragraph splitting if a single line is too long for the budget.
 */
function paginateSingleColumn(
    lines: PaginatableLine[],
    budgetPx: number,
    ceiling: number,
    speakerExtra: number,
    measure: SlideMeasureAdapter,
    splitLongParagraph: (text: string, maxHeightPx: number) => string[]
): PaginatableLine[][] {
    const pages: PaginatableLine[][] = [];
    let chunk: PaginatableLine[] = [];
    let height = 0;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const prevLine = i > 0 ? lines[i - 1] : null;
        const speakerChanged = Boolean(
            line.speaker && line.speaker !== prevLine?.speaker && i > 0
        );

        const lineHeight = measure.arabicParagraph(line.text) + (speakerChanged ? speakerExtra : 0);
        const stackGap = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;

        if (lineHeight > budgetPx) {
            if (chunk.length > 0) {
                pages.push([...chunk]);
                chunk = [];
                height = 0;
            }

            const parts = splitLongParagraph(line.text, budgetPx);

            for (let partIdx = 0; partIdx < parts.length; partIdx++) {
                const part = parts[partIdx];
                const partLine = { ...line, text: part };
                const partHeight = measure.arabicParagraph(part);
                const finalPartHeight = (partIdx === 0 && speakerChanged)
                    ? partHeight + speakerExtra
                    : partHeight;

                if (height + stackGap + finalPartHeight <= ceiling) {
                    if (chunk.length === 0 && partIdx === 0) {
                        chunk.push(partLine);
                        height = finalPartHeight;
                    } else if (chunk.length > 0) {
                        const strippedLine = { ...partLine, speaker: undefined };
                        chunk.push(strippedLine);
                        height += stackGap + partHeight;
                    } else {
                        const strippedLine = { ...partLine, speaker: undefined };
                        chunk.push(strippedLine);
                        height = partHeight;
                    }
                } else {
                    if (chunk.length > 0) {
                        pages.push([...chunk]);
                        chunk = [];
                        height = 0;
                    }
                    const strippedLine = { ...partLine, speaker: undefined };
                    chunk.push(strippedLine);
                    height = partHeight;
                }
            }

            i++;
            continue;
        }

        const totalWithGap = height + (chunk.length > 0 ? stackGap : 0) + lineHeight;

        if (totalWithGap > ceiling && chunk.length > 0) {
            pages.push([...chunk]);
            chunk = [];
            height = 0;
            chunk.push(line);
            height = lineHeight;
        } else {
            if (chunk.length === 0) {
                chunk.push(line);
                height = lineHeight;
            } else {
                chunk.push(line);
                height += stackGap + lineHeight;
            }
        }

        i++;
    }

    if (chunk.length > 0) {
        pages.push(chunk);
    }

    return pages;
}

/**
 * Legacy pagination for multi-column lines (Dual/Triple mode) using flat lines.
 * This version does NOT preserve row integrity - use paginateIntegratedRows instead.
 *
 * @deprecated Use paginateIntegratedRows for better row integrity
 */
function paginateMultiColumnLegacy(
    lines: PaginatableLine[],
    triple: boolean,
    budgetPx: number,
    ceiling: number,
    speakerExtra: number,
    measure: SlideMeasureAdapter
): PaginatableLine[][] {
    const arabicLines = lines.filter((l) => l.lang_type === 'arabic');
    const arcopticLines = lines.filter((l) => l.lang_type === 'coptic_arabized');
    const copticLines = lines.filter((l) => l.lang_type === 'coptic');
    const maxLen = Math.max(arabicLines.length, arcopticLines.length, copticLines.length);

    const rowRatios = new Map<number, number[]>();

    const rowHeight = (i: number): number => {
        const ar = arabicLines[i];
        const copAr = arcopticLines[i];
        const cop = copticLines[i];
        const arT = ar?.text ?? '';
        const copArT = copAr?.text ?? '';
        const copT = cop?.text ?? '';

        if (!rowRatios.has(i)) {
            const ratios = measure.findBalancedRatios(arT, copArT, copT, triple);
            rowRatios.set(i, ratios);
        }

        const ratios = rowRatios.get(i)!;
        const textH = measure.measureRowWithRatios(arT, copArT, copT, triple, ratios);

        const prevSpeaker = i > 0
            ? arabicLines[i-1]?.speaker || arcopticLines[i-1]?.speaker || copticLines[i-1]?.speaker || null
            : null;
        const rowSpeaker = ar?.speaker || arcopticLines[i]?.speaker || copticLines[i]?.speaker || null;
        const speakerChanged = Boolean(rowSpeaker && rowSpeaker !== prevSpeaker && i > 0);

        return textH + (speakerChanged ? speakerExtra : 0);
    };

    const pages: PaginatableLine[][] = [];
    let chunk: PaginatableLine[] = [];
    let currentHeight = 0;
    let i = 0;

    while (i < maxLen) {
        const cost = rowHeight(i);
        const rowLines = linesForRow(i, arabicLines, arcopticLines, copticLines, triple);

        if (rowLines.length === 0) {
            i++;
            continue;
        }

        const gapBeforeRow = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
        const totalWithGap = currentHeight + gapBeforeRow + cost;

        if (cost > budgetPx) {
            if (chunk.length > 0) {
                pages.push([...chunk]);
                chunk = [];
                currentHeight = 0;
            }

            const ar = arabicLines[i];
            const copAr = arcopticLines[i];
            const cop = copticLines[i];
            const prevSpeaker = i > 0
                ? arabicLines[i-1]?.speaker || arcopticLines[i-1]?.speaker || copticLines[i-1]?.speaker || null
                : null;
            const rowSpeaker = ar?.speaker || copAr?.speaker || cop?.speaker || null;
            const speakerChangedBase = Boolean(rowSpeaker && rowSpeaker !== prevSpeaker && i > 0);

            const ratios = rowRatios.get(i) || measure.findBalancedRatios(
                ar?.text ?? '',
                copAr?.text ?? '',
                cop?.text ?? '',
                triple
            );

            const segments = measure.splitFullRowSynchronizedWithRatios(
                ar?.text ?? '',
                copAr?.text ?? '',
                cop?.text ?? '',
                triple,
                budgetPx,
                ratios
            );

            let segIdx = 0;
            for (const seg of segments) {
                let partial = linesFromSplitSegment(ar, copAr, cop, seg, triple);
                if (partial.length === 0) {
                    segIdx++;
                    continue;
                }

                const includeSpeaker = segIdx === 0 && speakerChangedBase;
                if (segIdx > 0) {
                    partial = stripSpeakers(partial);
                }

                const segCost = measure.measureRowWithRatios(seg.ar, seg.copAr, seg.cop, triple, ratios) + (includeSpeaker ? speakerExtra : 0);
                const gap = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;

                if (currentHeight + gap + segCost > ceiling && chunk.length > 0) {
                    pages.push([...chunk]);
                    chunk = [];
                    currentHeight = 0;
                }

                const pushGap = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
                chunk.push(...partial);
                currentHeight += pushGap + segCost;
                segIdx++;
            }

            i++;
            continue;
        }

        if (totalWithGap > ceiling && chunk.length > 0) {
            pages.push([...chunk]);
            chunk = [];
            currentHeight = 0;
            chunk.push(...rowLines);
            currentHeight = cost;
        } else {
            const pushGap = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
            chunk.push(...rowLines);
            currentHeight += pushGap + cost;
        }

        i++;
    }

    if (chunk.length > 0) {
        pages.push(chunk);
    }

    return pages;
}

/**
 * Final Slide Pagination Orchestrator
 *
 * Takes a raw list of liturgical lines and organizes them into an array of "pages".
 * Each page is a list of lines that fits within the target visual height.
 *
 * For multi-column modes, this function automatically converts the flat lines
 * into IntegratedRows to preserve the relationship between Arabic, Coptic Arabized,
 * and Coptic Script texts.
 *
 * Calculations:
 * 1. contentBudget: Target pixel height for content (excluding margins/reserve).
 * 2. ceiling: Absolute pixel maximum before a page transition MUST occur.
 * 3. speakerExtra: Reserved space for speaker transition gaps/styles.
 */
export function computeSlidePages(
    lines: PaginatableLine[],
    mode: MultiColumnMode,
    budgetPx: number,
    tolerancePx: number,
    fontSizePx: number,
    measure: SlideMeasureAdapter,
    splitLongParagraph: (text: string, maxHeightPx: number) => string[]
): PaginatableLine[][] {
    const safeBudget = Math.max(80, Math.floor(budgetPx));
    const reserve = paginationVerticalReservePx(fontSizePx);
    const contentBudget = Math.max(64, safeBudget - reserve);
    const ceiling = paginationOverflowCeiling(contentBudget, tolerancePx);
    const speakerExtra = speakerBlockExtraPx(fontSizePx);

    if (!lines || lines.length === 0) {
        return [];
    }

    if (mode === 'single') {
        return paginateSingleColumn(
            lines,
            contentBudget,
            ceiling,
            speakerExtra,
            measure,
            splitLongParagraph
        );
    }

    // For multi-column modes, use integrated rows to preserve Arabic/Coptic pairing
    const isTriple = mode === 'triple';
    const integratedRows = groupIntoIntegratedRows(lines);

    // Use the integrated rows pagination for better row integrity
    return paginateIntegratedRows(
        integratedRows,
        isTriple,
        contentBudget,
        ceiling,
        speakerExtra,
        measure
    );
}
