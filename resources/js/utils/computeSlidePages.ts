import {
    type MultiColumnMode,
    paginationOverflowCeiling,
    speakerBlockExtraPx,
} from '@/utils/presentationLayout';

export interface PaginatableLine {
    id: number;
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    text: string;
    speaker?: string;
}

export interface SlideMeasureAdapter {
    arabicParagraph: (text: string) => number;
    dualRow: (ar: string, copAr: string) => number;
    tripleRow: (ar: string, copAr: string, cop: string) => number;
}

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
    if (ar) {
        chunk.push(ar);
    }
    if (copAr) {
        chunk.push(copAr);
    }
    if (triple && cop) {
        chunk.push(cop);
    }
    return chunk;
}

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

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prev = lines[i - 1];
        const speakerChanged = Boolean(
            line.speaker && line.speaker !== prev?.speaker && i > 0
        );
        const block = measure.arabicParagraph(line.text) + (speakerChanged ? speakerExtra : 0);

        if (block > budgetPx) {
            if (chunk.length > 0) {
                pages.push(chunk);
                chunk = [];
                height = 0;
            }
            const parts = splitLongParagraph(line.text, budgetPx);
            parts.forEach((t) => {
                pages.push([{ ...line, text: t }]);
            });
            continue;
        }

        if (height + block > ceiling && chunk.length > 0) {
            pages.push(chunk);
            chunk = [];
            height = 0;
        }

        chunk.push(line);
        height += block;

        let j = i + 1;
        while (j < lines.length) {
            const nextLine = lines[j];
            const nextPrev = lines[j - 1];
            const nextSpeakerChanged = Boolean(
                nextLine.speaker && nextLine.speaker !== nextPrev?.speaker
            );
            const nextBlock =
                measure.arabicParagraph(nextLine.text) +
                (nextSpeakerChanged ? speakerExtra : 0);

            if (height + nextBlock <= ceiling) {
                chunk.push(nextLine);
                height += nextBlock;
                i = j;
                j++;
            } else {
                break;
            }
        }
    }

    if (chunk.length > 0) {
        pages.push(chunk);
    }

    return pages;
}

function paginateMultiColumn(
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

    const rowHeight = (i: number): number => {
        const ar = arabicLines[i];
        const copAr = arcopticLines[i];
        const cop = copticLines[i];
        const arT = ar?.text ?? '';
        const copArT = copAr?.text ?? '';
        const copT = cop?.text ?? '';
        const hasCopScript = copT.trim().length > 0;
        const textH =
            triple && hasCopScript
                ? measure.tripleRow(arT, copArT, copT)
                : measure.dualRow(arT, copArT);
        const prevSpeaker =
            i > 0
                ? arabicLines[i - 1]?.speaker ||
                  arcopticLines[i - 1]?.speaker ||
                  copticLines[i - 1]?.speaker ||
                  null
                : null;
        const rowSpeaker =
            ar?.speaker || arcopticLines[i]?.speaker || copticLines[i]?.speaker || null;
        const speakerChanged = Boolean(rowSpeaker && rowSpeaker !== prevSpeaker && i > 0);
        return textH + (speakerChanged ? speakerExtra : 0);
    };

    const pages: PaginatableLine[][] = [];
    let chunk: PaginatableLine[] = [];
    let currentHeight = 0;

    for (let i = 0; i < maxLen; i++) {
        const cost = rowHeight(i);
        const rowLines = linesForRow(i, arabicLines, arcopticLines, copticLines, triple);

        if (rowLines.length === 0) {
            continue;
        }

        if (cost > budgetPx) {
            if (chunk.length > 0) {
                pages.push(chunk);
                chunk = [];
                currentHeight = 0;
            }
            pages.push(rowLines);
            continue;
        }

        if (currentHeight + cost > ceiling && chunk.length > 0) {
            pages.push(chunk);
            chunk = [];
            currentHeight = 0;
        }

        chunk.push(...rowLines);
        currentHeight += cost;

        let j = i + 1;
        while (j < maxLen) {
            const nextLines = linesForRow(j, arabicLines, arcopticLines, copticLines, triple);
            if (nextLines.length === 0) {
                j++;
                continue;
            }
            const nextCost = rowHeight(j);
            if (nextCost > budgetPx) {
                break;
            }
            if (currentHeight + nextCost <= ceiling) {
                chunk.push(...nextLines);
                currentHeight += nextCost;
                i = j;
                j++;
            } else {
                break;
            }
        }
    }

    if (chunk.length > 0) {
        pages.push(chunk);
    }

    return pages;
}

/**
 * Paginates logical lines into pages that fit the measured body height.
 * Measurement must use the same widths, gaps, and line-height as the live slide.
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
    const ceiling = paginationOverflowCeiling(safeBudget, tolerancePx);
    const speakerExtra = speakerBlockExtraPx(fontSizePx);

    if (!lines || lines.length === 0) {
        return [];
    }

    if (mode === 'single') {
        return paginateSingleColumn(
            lines,
            safeBudget,
            ceiling,
            speakerExtra,
            measure,
            splitLongParagraph
        );
    }

    return paginateMultiColumn(lines, mode === 'triple', safeBudget, ceiling, speakerExtra, measure);
}
