import { useMemo } from 'react';

interface OriginalSlide {
    id: string;
    section_code: string;
    section_name: string;
    intonation_ar: string;
    title: string;
    lines: any[];
    has_coptic: boolean;
}

interface SplitSlide extends OriginalSlide {
    /** Index of this page within the original slide (0-based) */
    pageIndex: number;
    /** Total pages the original slide was split into */
    totalPages: number;
    /** The original slide index before splitting */
    originalIndex: number;
}

/**
 * Maximum number of "line-units" per slide.
 *
 * For slides WITH Coptic:  each paired row (Arabic + Coptic) = 1 unit.
 * For slides WITHOUT Coptic: each line = 1 unit.
 *
 * We estimate conservatively based on typical viewport height:
 *   - Header area ≈ 200px (section title + intonation + ornament)
 *   - Bottom controls ≈ 100px
 *   - Available ≈ viewport - 300px
 *   - Each text line ≈ 100–120px at presentation sizes
 *
 * `maxLinesPerSlide` can be tuned per display, but 4 is a safe
 * default for projectors / laptops at large font sizes.
 */
const MAX_LINES_PER_SLIDE = 4;

/**
 * Takes the raw slides from the backend and splits any slide
 * whose content exceeds the viewport into multiple sub-slides,
 * each keeping the same section_name / intonation header.
 */
export function useSlideSplitter(
    slides: OriginalSlide[],
    maxLines: number = MAX_LINES_PER_SLIDE
): SplitSlide[] {
    return useMemo(() => {
        if (!slides || slides.length === 0) return [];

        const result: SplitSlide[] = [];

        slides.forEach((slide, originalIndex) => {
            const { lines, has_coptic } = slide;

            if (has_coptic) {
                // Split by paired lines
                const arabicLines = lines.filter(l => l.lang_type === 'arabic');
                const copticLines = lines.filter(l => l.lang_type === 'coptic_arabized');
                const pairCount = Math.max(arabicLines.length, copticLines.length);

                if (pairCount <= maxLines) {
                    // Fits in one slide
                    result.push({
                        ...slide,
                        pageIndex: 0,
                        totalPages: 1,
                        originalIndex,
                    });
                } else {
                    // Split into chunks
                    const totalPages = Math.ceil(pairCount / maxLines);
                    for (let page = 0; page < totalPages; page++) {
                        const startPair = page * maxLines;
                        const endPair = Math.min(startPair + maxLines, pairCount);

                        // Collect the lines for this page
                        const pageArabic = arabicLines.slice(startPair, endPair);
                        const pageCoptic = copticLines.slice(startPair, endPair);
                        const pageLines = [...pageArabic, ...pageCoptic];

                        result.push({
                            ...slide,
                            id: `${slide.id}-p${page}`,
                            lines: pageLines,
                            pageIndex: page,
                            totalPages,
                            originalIndex,
                        });
                    }
                }
            } else {
                // Arabic-only: split by line count
                if (lines.length <= maxLines) {
                    result.push({
                        ...slide,
                        pageIndex: 0,
                        totalPages: 1,
                        originalIndex,
                    });
                } else {
                    const totalPages = Math.ceil(lines.length / maxLines);
                    for (let page = 0; page < totalPages; page++) {
                        const start = page * maxLines;
                        const end = Math.min(start + maxLines, lines.length);

                        result.push({
                            ...slide,
                            id: `${slide.id}-p${page}`,
                            lines: lines.slice(start, end),
                            pageIndex: page,
                            totalPages,
                            originalIndex,
                        });
                    }
                }
            }
        });

        return result;
    }, [slides, maxLines]);
}
