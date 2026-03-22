import {
    type MultiColumnMode,
    PRES_ROW_BLOCK_STACK_GAP_PX,
    paginationOverflowCeiling,
    paginationVerticalReservePx,
    speakerBlockExtraPx,
} from '@/utils/presentationLayout';

export interface PaginatableLine {
    id: number;
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    text: string;
    speaker?: string;
}

export interface MultiColumnRowSegment {
    ar: string;
    copAr: string;
    cop: string;
}

export interface SlideMeasureAdapter {
    arabicParagraph: (text: string) => number;
    dualRow: (ar: string, copAr: string) => number;
    tripleRow: (ar: string, copAr: string, cop: string) => number;
    splitOverflowRow?: (
        ar: string,
        copAr: string,
        cop: string,
        triple: boolean,
        maxHeightPx: number
    ) => MultiColumnRowSegment[];
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

function linesFromSplitSegment(
    ar: PaginatableLine | undefined,
    copAr: PaginatableLine | undefined,
    cop: PaginatableLine | undefined,
    seg: MultiColumnRowSegment,
    triple: boolean
): PaginatableLine[] {
    const chunk: PaginatableLine[] = [];
    if (ar && seg.ar.trim().length > 0) {
        chunk.push({ ...ar, text: seg.ar });
    }
    if (copAr && seg.copAr.trim().length > 0) {
        chunk.push({ ...copAr, text: seg.copAr });
    }
    if (triple && cop && seg.cop.trim().length > 0) {
        chunk.push({ ...cop, text: seg.cop });
    }
    return chunk;
}

function stripSpeakers(lines: PaginatableLine[]): PaginatableLine[] {
    return lines.map((l) => ({ ...l, speaker: undefined }));
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
        const stackGap = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;

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

        if (height + stackGap + block > ceiling && chunk.length > 0) {
            pages.push(chunk);
            chunk = [];
            height = 0;
        }

        chunk.push(line);
        height += block + (chunk.length > 1 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0);

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
            const nextGap = PRES_ROW_BLOCK_STACK_GAP_PX;

            if (height + nextGap + nextBlock <= ceiling) {
                chunk.push(nextLine);
                height += nextGap + nextBlock;
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

    const segmentHeight = (
        seg: MultiColumnRowSegment,
        includeSpeaker: boolean,
        speakerExtraPx: number
    ): number => {
        const arT = seg.ar;
        const copArT = seg.copAr;
        const copT = seg.cop;
        const hasCopScript = copT.trim().length > 0;
        const textH =
            triple && hasCopScript
                ? measure.tripleRow(arT, copArT, copT)
                : measure.dualRow(arT, copArT);
        return textH + (includeSpeaker ? speakerExtraPx : 0);
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
            const ar = arabicLines[i];
            const copAr = arcopticLines[i];
            const cop = copticLines[i];
            const prevSpeaker =
                i > 0
                    ? arabicLines[i - 1]?.speaker ||
                      arcopticLines[i - 1]?.speaker ||
                      copticLines[i - 1]?.speaker ||
                      null
                    : null;
            const rowSpeaker =
                ar?.speaker || copAr?.speaker || cop?.speaker || null;
            const speakerChangedBase = Boolean(
                rowSpeaker && rowSpeaker !== prevSpeaker && i > 0
            );

            const segments =
                measure.splitOverflowRow?.(
                    ar?.text ?? '',
                    copAr?.text ?? '',
                    cop?.text ?? '',
                    triple,
                    budgetPx
                ) ?? [
                    {
                        ar: ar?.text ?? '',
                        copAr: copAr?.text ?? '',
                        cop: cop?.text ?? '',
                    },
                ];

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
                const segCost = segmentHeight(seg, includeSpeaker, speakerExtra);
                const stackGap = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
                if (currentHeight + stackGap + segCost > ceiling && chunk.length > 0) {
                    pages.push(chunk);
                    chunk = [];
                    currentHeight = 0;
                }
                chunk.push(...partial);
                currentHeight += stackGap + segCost;
                segIdx++;
            }
            continue;
        }

        const gapBeforeRow = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
        if (currentHeight + gapBeforeRow + cost > ceiling && chunk.length > 0) {
            pages.push(chunk);
            chunk = [];
            currentHeight = 0;
        }

        const stackBeforePush = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;
        chunk.push(...rowLines);
        currentHeight += stackBeforePush + cost;

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
            const nextGap = PRES_ROW_BLOCK_STACK_GAP_PX;
            if (currentHeight + nextGap + nextCost <= ceiling) {
                chunk.push(...nextLines);
                currentHeight += nextGap + nextCost;
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

    return paginateMultiColumn(lines, mode === 'triple', contentBudget, ceiling, speakerExtra, measure);
}
