import { useState, useEffect } from 'react';
import { TextPaginator } from '@/utils/TextPaginator';

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

        const maxHeight = window.innerHeight * 0.85;
        const paginator = new TextPaginator('slide-content-enter', baseFontSize);

        const result: SplitSlide[] = [];

        slides.forEach((slide, originalIndex) => {
            const { lines, has_coptic: hasCoptic } = slide;

            if (hasCoptic) {
                const arabicLines = lines.filter((l: any) => l.lang_type === 'arabic');
                const copticLines = lines.filter((l: any) => l.lang_type === 'coptic_arabized');
                const pureCopticLines = lines.filter((l: any) => l.lang_type === 'coptic');

                const pairCount = Math.max(arabicLines.length, copticLines.length, pureCopticLines.length);

                let currentPagePairs: any[] = [];
                let currentHeight = 0;
                const pages: any[][] = [];

                for (let i = 0; i < pairCount; i++) {
                    const ar = arabicLines[i]?.text || '';
                    const copAr = copticLines[i]?.text || '';
                    const cop = pureCopticLines[i]?.text || '';

                    const h = paginator.measureTripleColumnRowHeight(ar, copAr, cop);

                    if (currentHeight + h > maxHeight && currentPagePairs.length > 0) {
                        pages.push(currentPagePairs);
                        currentPagePairs = [];
                        currentHeight = 0;
                    }

                    currentPagePairs.push({ ar: arabicLines[i], copAr: copticLines[i], cop: pureCopticLines[i] });
                    currentHeight += h;
                }

                if (currentPagePairs.length > 0) {
                    pages.push(currentPagePairs);
                }

                pages.forEach((pagePairs, pIdx) => {
                    const pageLines = pagePairs.flatMap((p: any) => [p.ar, p.copAr, p.cop].filter(Boolean));
                    result.push({
                        ...slide,
                        id: `${slide.id}-p${pIdx}`,
                        lines: pageLines,
                        pageIndex: pIdx,
                        totalPages: pages.length,
                        originalIndex,
                    });
                });
            } else {
                const pages: any[][] = [];
                let currentPageLines: any[] = [];
                let currentHeight = 0;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const h = paginator.measureArabicParagraphHeight(line.text);

                    if (h > maxHeight) {
                        if (currentPageLines.length > 0) {
                            pages.push(currentPageLines);
                            currentPageLines = [];
                            currentHeight = 0;
                        }

                        const textChunks = paginator.paginate(line.text, maxHeight);
                        textChunks.forEach((chunk) => {
                            pages.push([{ ...line, text: chunk }]);
                        });
                        continue;
                    }

                    if (currentHeight + h > maxHeight && currentPageLines.length > 0) {
                        pages.push(currentPageLines);
                        currentPageLines = [];
                        currentHeight = 0;
                    }

                    currentPageLines.push(line);
                    currentHeight += h;
                }

                if (currentPageLines.length > 0) {
                    pages.push(currentPageLines);
                }

                pages.forEach((pageLines, pIdx) => {
                    result.push({
                        ...slide,
                        id: `${slide.id}-p${pIdx}`,
                        lines: pageLines,
                        pageIndex: pIdx,
                        totalPages: pages.length,
                        originalIndex,
                    });
                });
            }
        });

        paginator.cleanup();
        setSplitSlides(result);
    }, [slides, baseFontSize]);

    return splitSlides;
}
