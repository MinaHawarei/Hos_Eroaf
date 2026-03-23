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
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const prevLine = i > 0 ? lines[i - 1] : null;
        const speakerChanged = Boolean(
            line.speaker && line.speaker !== prevLine?.speaker && i > 0
        );

        // حساب ارتفاع السطر مع مراعاة تغيير المتحدث
        const lineHeight = measure.arabicParagraph(line.text) + (speakerChanged ? speakerExtra : 0);
        const stackGap = chunk.length > 0 ? PRES_ROW_BLOCK_STACK_GAP_PX : 0;

        // حالة 1: السطر طويل جداً ويحتاج للتقسيم
        if (lineHeight > budgetPx) {
            // إذا كان هناك محتوى في الـ chunk الحالي، احفظه أولاً
            if (chunk.length > 0) {
                pages.push([...chunk]);
                chunk = [];
                height = 0;
            }

            // تقسيم النص الطويل إلى أجزاء
            const parts = splitLongParagraph(line.text, budgetPx);

            // معالجة كل جزء على حدة
            for (let partIdx = 0; partIdx < parts.length; partIdx++) {
                const part = parts[partIdx];
                const partLine = { ...line, text: part };

                // حساب ارتفاع الجزء (بدون speaker extra لأننا نتعامل مع نفس المتحدث)
                const partHeight = measure.arabicParagraph(part);

                // إذا كان هذا هو الجزء الأول والمتحدث مختلف، أضف الـ speaker extra
                const finalPartHeight = (partIdx === 0 && speakerChanged)
                    ? partHeight + speakerExtra
                    : partHeight;

                // التحقق إذا كان الجزء ينتهي في منتصف الصفحة أو يحتاج صفحة جديدة
                if (height + stackGap + finalPartHeight <= ceiling) {
                    // يمكن إضافة الجزء إلى الـ chunk الحالي
                    if (chunk.length === 0 && partIdx === 0) {
                        // أول جزء، أضفه مع المتحدث إذا لزم
                        chunk.push(partLine);
                        height = finalPartHeight;
                    } else if (chunk.length > 0) {
                        // أضف الأجزاء التالية بدون تكرار المتحدث
                        const strippedLine = { ...partLine, speaker: undefined };
                        chunk.push(strippedLine);
                        height += stackGap + partHeight;
                    } else {
                        // chunk فارغ، ابدأ صفحة جديدة
                        const strippedLine = { ...partLine, speaker: undefined };
                        chunk.push(strippedLine);
                        height = partHeight;
                    }
                } else {
                    // الجزء لا يتسع، احفظ الصفحة الحالية وابدأ صفحة جديدة
                    if (chunk.length > 0) {
                        pages.push([...chunk]);
                        chunk = [];
                        height = 0;
                    }

                    // أضف الجزء إلى صفحة جديدة
                    const strippedLine = { ...partLine, speaker: undefined };
                    chunk.push(strippedLine);
                    height = partHeight;
                }
            }

            i++;
            continue;
        }

        // حالة 2: السعر عادي، حاول إضافته إلى الصفحة الحالية
        const totalWithGap = height + (chunk.length > 0 ? stackGap : 0) + lineHeight;

        if (totalWithGap > ceiling && chunk.length > 0) {
            // لا يتسع، احفظ الصفحة الحالية وابدأ صفحة جديدة
            pages.push([...chunk]);
            chunk = [];
            height = 0;

            // أضف السطر الحالي إلى الصفحة الجديدة
            chunk.push(line);
            height = lineHeight;
        } else {
            // يتسع، أضفه إلى الصفحة الحالية
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

    // أضف آخر صفحة إذا كان فيها محتوى
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

        // حالة الصف طويل جداً ويحتاج تقسيم
        if (cost > budgetPx) {
            if (chunk.length > 0) {
                pages.push([...chunk]);
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

                const segCost = measure.dualRow(seg.ar, seg.copAr) + (includeSpeaker ? speakerExtra : 0);
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

        // حالة عادية
        if (totalWithGap > ceiling && chunk.length > 0) {
            pages.push([...chunk]);
            chunk = [];
            currentHeight = 0;

            // أضف الصف الحالي إلى الصفحة الجديدة
            chunk.push(...rowLines);
            currentHeight = cost;
        } else {
            // أضف إلى الصفحة الحالية
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
