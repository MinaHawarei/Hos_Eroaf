import { TextPaginator } from './TextPaginator';
import { computeSlidePages, groupIntoIntegratedRows, flattenIntegratedRows } from './computeSlidePages';
import {
    resolveMultiColumnMode,
    paginationTolerancePx,
    paginationVerticalReservePx,
    paginationOverflowCeiling,
    speakerBlockExtraPx,
    PRES_ROW_BLOCK_STACK_GAP_PX,
} from './presentationLayout';

interface Line {
    id: number;
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    text: string;
    speaker?: string;
}

interface Slide {
    id: string;
    section_code: string;
    section_name: string;
    intonation?: string | null;
    conclusion?: string | null;
    title?: string;
    lines?: Line[];
    has_coptic?: boolean;
    has_alternatives?: boolean;
}

/**
 * Result of the slide splitting process.
 */
export interface SplitResult {
    /** The new flattened array of slides (original small slides + sub-parts of large slides) */
    slides: Slide[];
    /** Number of slides before splitting */
    totalOriginalSlides: number;
    /** Total number of slides after splitting */
    totalSplitSlides: number;
    /** Map tracking which sub-slide IDs belong to which original slide ID */
    splitMap: Map<string, string[]>;
}

/**
 * Iterates through a list of liturgical slides and splits any that exceed the
 * maximum allowable height into multiple sub-slides.
 *
 * This function now uses integrated row logic to ensure Arabic, Coptic Arabized,
 * and Coptic Script texts stay together during the splitting process.
 *
 * @param slides - The original array of slides.
 * @param maxHeightPx - Maximum height of the presentation area.
 * @param fontSizePx - Current font size (affects measurement).
 * @param containerWidthPx - Width of the presentation container.
 * @param measureAdapter - The TextPaginator instance for DOM measurement.
 */
export async function splitLargeSlides(
    slides: Slide[],
    maxHeightPx: number,
    fontSizePx: number,
    containerWidthPx: number,
    measureAdapter: any
): Promise<SplitResult> {
    const result: Slide[] = [];
    const splitMap = new Map<string, string[]>();
    let totalSplit = 0;

    for (const slide of slides) {
        const splitSlides = await splitSingleSlide(
            slide,
            maxHeightPx,
            fontSizePx,
            containerWidthPx,
            measureAdapter
        );

        result.push(...splitSlides);
        totalSplit += splitSlides.length;

        // Record the lineage: Original ID -> [Part1_ID, Part2_ID, ...]
        splitMap.set(
            slide.id,
            splitSlides.map(s => s.id)
        );
    }

    return {
        slides: result,
        totalOriginalSlides: slides.length,
        totalSplitSlides: totalSplit,
        splitMap,
    };
}

/**
 * Logic for splitting a single liturgical slide.
 * Delegates actual pagination to computeSlidePages which now preserves integrated rows.
 */
async function splitSingleSlide(
    slide: Slide,
    maxHeightPx: number,
    fontSizePx: number,
    containerWidthPx: number,
    measureAdapter: any
): Promise<Slide[]> {
    // Alternative slides (slides with multiple selectable versions) don't have direct lines and don't need splitting
    if (slide.has_alternatives || !slide.lines || slide.lines.length === 0) {
        return [slide];
    }

    // Resolve column mode (Single/Dual/Triple) based on script content
    const hasCopticScript = slide.lines.some(line => line.lang_type === 'coptic');
    const columnMode = resolveMultiColumnMode(slide.has_coptic ?? false, hasCopticScript);

    // Calculate layout constraints
    const tolerance = paginationTolerancePx(maxHeightPx);
    const reserve = paginationVerticalReservePx(fontSizePx);
    const contentBudget = Math.max(64, maxHeightPx - reserve);
    const ceiling = paginationOverflowCeiling(contentBudget, tolerance);

    // Closure to wrap the low-level text splitter (sentence-aware for better splitting)
    const splitLongParagraph = (text: string, maxHeight: number): string[] => {
        return splitTextByHeightSentences(text, maxHeight, measureAdapter);
    };

    // Use the core pagination orchestrator to get the page breaks
    // computeSlidePages now automatically groups lines into integrated rows
    const pages = computeSlidePages(
        slide.lines,
        columnMode,
        maxHeightPx,
        tolerance,
        fontSizePx,
        measureAdapter,
        splitLongParagraph
    );

    // If it all fits on one page, keep it as is
    if (pages.length <= 1) {
        return [slide];
    }

    const splitSlides: Slide[] = [];

    pages.forEach((pageLines, index) => {
        const partNumber = index + 1;
        const isFirst = index === 0;
        const isLast = index === pages.length - 1;
        const newSlideId = `${slide.id}_p${partNumber}`;

        const newSlide: Slide = {
            ...slide,
            id: newSlideId,
            lines: pageLines,
            // Append part numbering to the title (e.g., "The Prayer (2/3)")
            title: pages.length > 1 && partNumber > 1
                ? `${slide.title} (${partNumber}/${pages.length})`
                : slide.title,
            // Only keep intonation in the first part and conclusion in the last part
            intonation: isFirst ? slide.intonation : null,
            conclusion: isLast ? slide.conclusion : null,
        };

        splitSlides.push(newSlide);
    });

    return splitSlides;
}

/**
 * Splits a single text paragraph into multiple segments based on rendered height.
 * Uses sentence boundaries for cleaner splits.
 */
function splitTextByHeightSentences(
    text: string,
    maxHeightPx: number,
    measureAdapter: any
): string[] {
    if (!text || text.trim().length === 0) {
        return [text];
    }

    // Split into sentences first (respects Arabic/Coptic punctuation)
    const sentences = splitIntoSentences(text);

    if (sentences.length === 0) {
        return [text];
    }

    const parts: string[] = [];
    let currentPart = '';
    let currentHeight = 0;

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const testPart = currentPart ? `${currentPart} ${sentence}` : sentence;
        const testHeight = measureAdapter.arabicParagraph(testPart);

        if (testHeight > maxHeightPx && currentPart) {
            // Current sentence would exceed height, save current part and start new
            parts.push(currentPart);
            currentPart = sentence;
            currentHeight = measureAdapter.arabicParagraph(sentence);
        } else {
            // Sentence fits, continue accumulating
            currentPart = testPart;
            currentHeight = testHeight;
        }
    }

    // Add the last part
    if (currentPart) {
        parts.push(currentPart);
    }

    // If no split was actually needed, return original
    return parts.length > 0 ? parts : [text];
}

/**
 * Splits text into sentences by looking for Arabic/English punctuation.
 */
function splitIntoSentences(text: string): string[] {
    if (!text.trim()) return [];
    // Split by . ! ؟ ; : followed by space or end of string
    const sentences = text.split(/([.!؟;:]+[\s\n]+|[\n]+)/);
    const result: string[] = [];
    for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].trim()) {
            if (i + 1 < sentences.length && /[.!؟;:]/.test(sentences[i + 1]?.trim() || '')) {
                result.push(sentences[i] + sentences[i + 1]);
                i++;
            } else {
                result.push(sentences[i]);
            }
        }
    }
    return result.filter(s => s.trim().length > 0);
}

/**
 * Legacy word-based text splitter (kept for backward compatibility).
 * Use splitTextByHeightSentences for better results.
 */
function splitTextByHeight(
    text: string,
    maxHeightPx: number,
    measureAdapter: any
): string[] {
    if (!text || text.trim().length === 0) {
        return [text];
    }

    // Tokenize by whitespace
    const words = text.split(/\s+/);
    const parts: string[] = [];
    let currentPart = '';
    let currentHeight = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testPart = currentPart ? `${currentPart} ${word}` : word;
        const testHeight = measureAdapter.arabicParagraph(testPart);

        if (testHeight > maxHeightPx && currentPart) {
            // If the current word makes the segment exceed height, stop here and start a new part
            parts.push(currentPart);
            currentPart = word;
            currentHeight = measureAdapter.arabicParagraph(word);
        } else {
            // Part fits, continue accumulating
            currentPart = testPart;
            currentHeight = testHeight;
        }
    }

    if (currentPart) {
        parts.push(currentPart);
    }

    return parts.length > 0 ? parts : [text];
}

/**
 * Estimates the total rendered height of a slide BEFORE splitting.
 * This is used to decide if splitLargeSlides needs to be called.
 */
export async function estimateSlideHeight(
    slide: Slide,
    fontSizePx: number,
    containerWidthPx: number,
    measureAdapter: any
): Promise<number> {
    if (slide.has_alternatives || !slide.lines || slide.lines.length === 0) {
        return 0;
    }

    const hasCopticScript = slide.lines.some(line => line.lang_type === 'coptic');
    const columnMode = resolveMultiColumnMode(slide.has_coptic ?? false, hasCopticScript);

    let totalHeight = 0;
    const speakerExtra = speakerBlockExtraPx(fontSizePx);
    const lineGap = PRES_ROW_BLOCK_STACK_GAP_PX;

    if (columnMode === 'single') {
        // Calculate each line's height and accumulate with stack gaps and speaker offsets
        for (let i = 0; i < slide.lines.length; i++) {
            const line = slide.lines[i];
            const prevLine = i > 0 ? slide.lines[i - 1] : null;
            const speakerChanged = line.speaker && line.speaker !== prevLine?.speaker;

            let lineHeight = measureAdapter.arabicParagraph(line.text);
            if (speakerChanged) {
                lineHeight += speakerExtra;
            }

            totalHeight += lineHeight;
            if (i < slide.lines.length - 1) {
                totalHeight += lineGap;
            }
        }
    } else {
        // Calculate row heights for multi-column layouts
        const arabicLines = slide.lines.filter(l => l.lang_type === 'arabic');
        const arcopticLines = slide.lines.filter(l => l.lang_type === 'coptic_arabized');
        const copticLines = slide.lines.filter(l => l.lang_type === 'coptic');
        const maxRows = Math.max(arabicLines.length, arcopticLines.length, copticLines.length);
        const isTriple = columnMode === 'triple';

        for (let i = 0; i < maxRows; i++) {
            const ar = arabicLines[i];
            const copAr = arcopticLines[i];
            const cop = isTriple ? copticLines[i] : null;

            const arText = ar?.text || '';
            const copArText = copAr?.text || '';
            const copText = cop?.text || '';

            let rowHeight = isTriple && copText
                ? measureAdapter.tripleRow(arText, copArText, copText)
                : measureAdapter.dualRow(arText, copArText);

            const prevAr = i > 0 ? arabicLines[i - 1] : null;
            const speakerChanged = ar?.speaker && ar.speaker !== prevAr?.speaker;
            if (speakerChanged) {
                rowHeight += speakerExtra;
            }

            totalHeight += rowHeight;
            if (i < maxRows - 1) {
                totalHeight += lineGap;
            }
        }
    }

    return totalHeight;
}

/**
 * Predicate to check if a slide exceeds the maximum height and requires splitting.
 */
export async function needsSplitting(
    slide: Slide,
    maxHeightPx: number,
    fontSizePx: number,
    containerWidthPx: number,
    measureAdapter: any
): Promise<boolean> {
    const estimatedHeight = await estimateSlideHeight(
        slide,
        fontSizePx,
        containerWidthPx,
        measureAdapter
    );

    const tolerance = paginationTolerancePx(maxHeightPx);
    return estimatedHeight > maxHeightPx + tolerance;
}

/**
 * Helper to revert split sub-slides back into their original single-slide form.
 * Useful if the viewport changes and splitting is no longer required.
 */
export function mergeSlides(slides: Slide[], splitMap: Map<string, string[]>): Slide[] {
    const merged: Slide[] = [];
    const processed = new Set<string>();

    for (const slide of slides) {
        // Identify the original slide ID for this part
        let originalId = slide.id;
        let isPart = false;

        for (const [original, parts] of splitMap.entries()) {
            if (parts.includes(slide.id)) {
                originalId = original;
                isPart = true;
                break;
            }
        }

        if (!isPart && !processed.has(slide.id)) {
            merged.push(slide);
            processed.add(slide.id);
        } else if (isPart && !processed.has(originalId)) {
            // Collect all parts of the original slide
            const originalSlide = slides.find(s => s.id === originalId);
            if (originalSlide) {
                merged.push(originalSlide);
                processed.add(originalId);
            }
        }
    }

    return merged;
}
