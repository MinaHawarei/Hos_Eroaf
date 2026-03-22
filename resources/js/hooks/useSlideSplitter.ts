import { useState, useEffect } from 'react';
import { TextPaginator } from '@/utils/TextPaginator';
import { computeSlidePages } from '@/utils/computeSlidePages';
import {
    linesHaveCopticScript,
    paginationTolerancePx,
    resolveMultiColumnMode,
} from '@/utils/presentationLayout';

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
    pageIndex: number;
    totalPages: number;
    originalIndex: number;
}

export function useSlideSplitter(slides: OriginalSlide[], baseFontSize: number = 28): SplitSlide[] {
    const [splitSlides, setSplitSlides] = useState<SplitSlide[]>([]);

    useEffect(() => {
        if (!slides || slides.length === 0 || typeof window === 'undefined') {
            setSplitSlides([]);
            return;
        }

        const budget = Math.round(window.innerHeight * 0.85);
        const tolerance = paginationTolerancePx(budget);
        const width = Math.max(280, window.innerWidth - 64);
        const paginator = new TextPaginator('slide-content-enter', baseFontSize, width);
        paginator.setContentWidth(width);

        const measureAdapter = {
            arabicParagraph: (t: string) => paginator.measureArabicParagraphHeight(t),
            dualRow: (ar: string, copAr: string) => paginator.measureDualColumnRowHeight(ar, copAr),
            tripleRow: (ar: string, copAr: string, cop: string) =>
                paginator.measureTripleColumnRowHeight(ar, copAr, cop),
            splitOverflowRow: (a: string, b: string, c: string, t: boolean, m: number) =>
                paginator.splitOverflowRow(a, b, c, t, m),
        };

        const result: SplitSlide[] = [];

        slides.forEach((slide, originalIndex) => {
            const { lines, has_coptic: hasCopticArabized } = slide;
            const mode = resolveMultiColumnMode(
                Boolean(hasCopticArabized),
                linesHaveCopticScript(lines)
            );

            const pages = computeSlidePages(
                lines,
                mode,
                budget,
                tolerance,
                baseFontSize,
                measureAdapter,
                (text, maxH) => paginator.paginate(text, maxH)
            );

            const finalPages = pages.length > 0 ? pages : [lines];

            finalPages.forEach((pageLines, pIdx) => {
                result.push({
                    ...slide,
                    id: `${slide.id}-p${pIdx}`,
                    lines: pageLines,
                    pageIndex: pIdx,
                    totalPages: finalPages.length,
                    originalIndex,
                });
            });
        });

        paginator.cleanup();
        setSplitSlides(result);
    }, [slides, baseFontSize]);

    return splitSlides;
}
