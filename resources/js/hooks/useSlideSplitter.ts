import { useState, useEffect } from 'react';
import { TextPaginator } from '@/utils/TextPaginator';
import { computeSlidePages, groupIntoIntegratedRows, flattenIntegratedRows } from '@/utils/computeSlidePages';
import {
    linesHaveCopticScript,
    paginationTolerancePx,
    resolveMultiColumnMode,
} from '@/utils/presentationLayout';

/**
 * Represents a slide as it comes from the backend/content JSON.
 */
interface OriginalSlide {
    /** Unique identifier (e.g., 'liturgy_1') */
    id: string;
    /** Category code (e.g., 'liturgy') */
    section_code: string;
    /** Human-readable section name */
    section_name: string;
    /** Optional musical intonation or instruction */
    intonation: string;
    /** Slide title */
    title: string;
    /** Array of PaginatableLine objects */
    lines: any[];
    /** Whether the slide contains Coptic-Arabized text */
    has_coptic: boolean;
}

/**
 * Represents a sub-part of a split slide with additional pagination metadata.
 */
interface SplitSlide extends OriginalSlide {
    /** Zero-based index of the current page within the original slide */
    pageIndex: number;
    /** Total number of pages the original slide was split into */
    totalPages: number;
    /** Original index in the source slides array */
    originalIndex: number;
}

/**
 * useSlideSplitter Hook
 *
 * Automatically re-paginates a list of liturgical slides whenever the content
 * or font size changes. It returns a flattened array where large slides have
 * been expanded into multiple sub-slides.
 *
 * This hook uses the same integrated row logic as SplitViewReader to ensure
 * Arabic, Coptic Arabized, and Coptic Script texts stay together during splitting.
 *
 * @param slides - The source array of liturgical slides.
 * @param baseFontSize - The current presentation font size (in pixels).
 */
export function useSlideSplitter(slides: OriginalSlide[], baseFontSize: number = 28): SplitSlide[] {
    const [splitSlides, setSplitSlides] = useState<SplitSlide[]>([]);

    useEffect(() => {
        if (!slides || slides.length === 0 || typeof window === 'undefined') {
            setSplitSlides([]);
            return;
        }

        // Target height is 85% of the viewport (leaves room for headers/footers)
        const budget = Math.round(window.innerHeight * 0.85);
        const tolerance = paginationTolerancePx(budget);
        const width = Math.max(280, window.innerWidth - 64);

        // Initialize the measurement engine
        const paginator = new TextPaginator('slide-content-enter', baseFontSize, width);
        paginator.setContentWidth(width);

        /**
         * Maps abstract measurement requirements from computeSlidePages
         * to concrete TextPaginator methods.
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

        const result: SplitSlide[] = [];

        slides.forEach((slide, originalIndex) => {
            const { lines, has_coptic: hasCopticArabized } = slide;
            const mode = resolveMultiColumnMode(
                Boolean(hasCopticArabized),
                linesHaveCopticScript(lines)
            );

            // Use computeSlidePages which now handles integrated rows internally
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
