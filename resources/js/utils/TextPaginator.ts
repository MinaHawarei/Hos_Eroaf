/**
 * Measures rendered text height and splits long blocks into pages that fit a max height.
 */

import type { MultiColumnRowSegment } from '@/utils/computeSlidePages';
import { PRES_BODY_LEADING_CLASS } from '@/utils/presentationLayout';
import { applyKashida } from '@/utils/ArabicKashida';

/**
 * Escape special HTML characters to prevent XSS or broken DOM structures in the sandbox.
 */
function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 
 * Matches SplitViewReader horizontal padding for accurate height measurement (px-8 / px-10). 
 * This ensures the sandbox width perfectly matches the real component's content area.
 */
const SANDBOX_PAD_X = '1.5rem';

/** Standard Arabic text style */
const P_RTL = `pres-slide-body-text ${PRES_BODY_LEADING_CLASS} text-foreground font-reading font-bold break-words text-center`;
/** Coptic-Arabic (Arabized Coptic) text style - usually red/blue for distinction */
const P_COP_AR = `pres-slide-body-text ${PRES_BODY_LEADING_CLASS} font-reading font-bold break-words text-center !text-[#880808] dark:!text-sky-400`;
/** Native Coptic script text style */
const P_COP_LTR = `pres-slide-body-text ${PRES_BODY_LEADING_CLASS} text-foreground font-reading font-bold break-words text-center`;

/**
 * Attempts to move a split index backwards to the nearest whitespace boundary
 * to avoid cutting words in half during pagination.
 */
function snapPrefixToWordBoundary(full: string, endIndex: number): number {
    if (endIndex <= 0) return 0;
    if (endIndex >= full.length) return full.length;
    
    const sub = full.slice(0, endIndex);
    const sp = sub.lastIndexOf(' ');
    const nbSp = sub.lastIndexOf('\u00a0');
    const cut = Math.max(sp, nbSp);
    
    // Only snap if we don't lose too much content (at most 70% of the target length)
    if (cut >= Math.floor(endIndex * 0.3)) {
        return cut + 1;
    }
    return endIndex;
}

/**
 * TextPaginator Engine
 * 
 * A utility class that uses an invisible "DOM Sandbox" to accurately measure how 
 * text will render in the browser. It handles complex multi-column pagination,
 * font-size scaling, and column ratio balancing for liturgical content.
 */
export class TextPaginator {
    /** Internal DOM element used for invisible text rendering and measurement */
    private sandbox: HTMLDivElement;

    /**
     * Initializes the paginator with a hidden DOM sandbox attached to the body.
     * 
     * @param className - Optional CSS class for the sandbox container
     * @param fontSizePx - Base font size for measurements
     * @param contentWidthPx - Fixed width of the content area to measure against
     */
    public constructor(
        private className: string = 'slide-content-enter',
        private fontSizePx: number = 28,
        contentWidthPx?: number
    ) {
        this.sandbox = document.createElement('div');
        this.sandbox.style.position = 'absolute';
        this.sandbox.style.visibility = 'hidden';
        this.sandbox.style.pointerEvents = 'none';
        this.sandbox.style.top = '-9999px';
        this.sandbox.style.left = '-9999px';
        this.sandbox.style.boxSizing = 'border-box';
        this.sandbox.style.paddingLeft = SANDBOX_PAD_X;
        this.sandbox.style.paddingRight = SANDBOX_PAD_X;
        this.sandbox.style.paddingTop = '0';
        this.sandbox.style.paddingBottom = '0';
        this.sandbox.className = this.className;
        this.sandbox.style.setProperty('--pres-font-size', `${this.fontSizePx}px`);
        
        // Default to window width if not specified
        this.setContentWidth(
            contentWidthPx ?? (typeof window !== 'undefined' ? window.innerWidth - 48 : 1100)
        );
        document.body.appendChild(this.sandbox);
    }

    /** Updates the base font size used for height calculation */
    public setFontSize(px: number): void {
        this.fontSizePx = px;
        this.sandbox.style.setProperty('--pres-font-size', `${px}px`);
    }

    /** Updates the container width to match the current viewport/layout */
    public setContentWidth(px: number): void {
        const w = Math.max(240, Math.floor(px));
        this.sandbox.style.width = `${w}px`;
        this.sandbox.style.maxWidth = 'none';
    }

    /** Removes the sandbox element from the DOM to prevent leaks */
    public cleanup(): void {
        if (this.sandbox.parentNode) {
            this.sandbox.parentNode.removeChild(this.sandbox);
        }
    }

    /**
     * Splits text into logical chunks (paragraphs then sentences) for incremental measurement.
     */
    private tokenize(text: string): string[] {
        if (!text) return [];
        
        // First split by explicit double newlines or breaks
        let tokens = text.split(/(\n\n|<br\s*\/?>\s*<br\s*\/?>)/i);
        tokens = tokens.filter(Boolean);

        const result: string[] = [];

        for (const token of tokens) {
            // Aggressively split long chunks into sentences for better pagination granularity
            if (token.length > 500 && !/<[a-z][\s\S]*>/i.test(token)) {
                const sentences = token.split(/([.،!?]+[\s]+)/);
                for (let i = 0; i < sentences.length; i += 2) {
                    const sentence = sentences[i];
                    const punct = sentences[i + 1] || '';
                    result.push(sentence + punct);
                }
            } else {
                result.push(token);
            }
        }
        return result.filter((t) => t.trim().length > 0);
    }

    /** Measures height of a single Arabic paragraph */
    public measureArabicParagraphHeight(textContent: string): number {
        this.sandbox.innerHTML = `
            <p class="${P_RTL}" dir="rtl">
                ${escapeHtml(textContent)}
            </p>
        `;
        return this.sandbox.scrollHeight;
    }

    /** Measures height of a two-column row (Arabic | Coptic-Arabized) */
    public measureDualColumnRowHeight(ar: string, copAr: string): number {
        this.sandbox.innerHTML = `
            <div class="flex w-full flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
                <div class="min-w-0 shrink-0 basis-full md:basis-[40%]">
                    <p class="${P_RTL}" dir="rtl">${escapeHtml(ar)}</p>
                </div>
                <div class="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25" aria-hidden="true"></div>
                <div class="min-w-0 shrink-0 basis-full md:basis-[60%]">
                    <p class="${P_COP_AR}" dir="rtl">${escapeHtml(copAr)}</p>
                </div>
            </div>
        `;
        return this.sandbox.scrollHeight;
    }

    /** Measures height of a three-column row (Arabic | Coptic-Arabized | Native Coptic) */
    public measureTripleColumnRowHeight(ar: string, copAr: string, cop: string): number {
        this.sandbox.innerHTML = `
            <div class="flex w-full flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
                <div class="min-w-0 shrink-0 basis-full md:basis-[30%]">
                    <p class="${P_RTL}" dir="rtl">${escapeHtml(ar)}</p>
                </div>
                <div class="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25" aria-hidden="true"></div>
                <div class="min-w-0 shrink-0 basis-full md:basis-[35%]">
                    <p class="${P_COP_AR}" dir="rtl">${escapeHtml(copAr)}</p>
                </div>
                <div class="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25" aria-hidden="true"></div>
                <div class="min-w-0 shrink-0 basis-full md:basis-[35%]">
                    <p class="${P_COP_LTR}" dir="ltr">${escapeHtml(cop)}</p>
                </div>
            </div>
        `;
        return this.sandbox.scrollHeight;
    }

    /** 
     * Measures the total height of a row (Dual or Triple column).
     * Automatically adjusts column widths based on the layout mode.
     */
    public measureFullRowHeight(ar: string, copAr: string, cop: string, triple: boolean): number {
        const ra = ar ?? '';
        const rb = copAr ?? '';
        const rc = cop ?? '';

        this.sandbox.innerHTML = `
            <div class="flex w-full flex-col gap-3 md:flex-row md:items-stretch md:gap-4" style="align-items: stretch;">
                <div class="min-w-0 shrink-0 basis-full ${triple ? 'md:basis-[30%]' : 'md:basis-[40%]'}">
                    <p class="${P_RTL}" dir="rtl">${escapeHtml(ra)}</p>
                </div>
                <div class="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25" aria-hidden="true"></div>
                <div class="min-w-0 shrink-0 basis-full ${triple ? 'md:basis-[35%]' : 'md:basis-[60%]'}">
                    <p class="${P_COP_AR}" dir="rtl">${escapeHtml(rb)}</p>
                </div>
                ${triple ? `
                <div class="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25" aria-hidden="true"></div>
                <div class="min-w-0 shrink-0 basis-full md:basis-[35%]">
                    <p class="${P_COP_LTR}" dir="ltr">${escapeHtml(rc)}</p>
                </div>
                ` : ''}
            </div>
        `;
        return this.sandbox.scrollHeight;
    }

    /** Returns length of text excluding spaces and control characters */
    private getEffectiveTextLength(text: string): number {
        if (!text) return 0;
        return text.replace(/[\s\u0640]+/g, '').length;
    }

    /**
     * Executes an iterative brute-force search to find the optimal column width ratios
     * that result in even vertical alignment across all columns.
     */
    public findBalancedRatios(ar: string, copAr: string, cop: string, triple: boolean): number[] {
        const ra = ar ?? '';
        const rb = copAr ?? '';
        const rc = cop ?? '';

        if (!triple) {
            let bestRatios = [0.5, 0.5];
            let minHeightDiff = Infinity;

            // Iterate through possible Arabic column widths (35% to 65%)
            for (let arPct = 0.35; arPct <= 0.65; arPct += 0.025) {
                const ratios = [arPct, 1 - arPct];
                const arHeight = this.measureArabicParagraphHeight(ra);
                const copArHeight = this.measureArabicParagraphHeight(rb);

                // Estimate height if expanded/shrunk by the ratio
                const adjustedArHeight = arHeight / ratios[0];
                const adjustedCopArHeight = copArHeight / ratios[1];
                const heightDiff = Math.abs(adjustedArHeight - adjustedCopArHeight);

                if (heightDiff < minHeightDiff) {
                    minHeightDiff = heightDiff;
                    bestRatios = ratios;
                }
            }
            return bestRatios;
        } else {
            let bestRatios = [0.33, 0.34, 0.33];
            let minHeightDiff = Infinity;

            // Nested iteration for triple columns (constraint: each >= 25%)
            for (let arPct = 0.25; arPct <= 0.45; arPct += 0.025) {
                for (let copArPct = 0.25; copArPct <= 0.45; copArPct += 0.025) {
                    const copPct = 1 - arPct - copArPct;
                    if (copPct < 0.25 || copPct > 0.45) continue;

                    const ratios = [arPct, copArPct, copPct];
                    const arHeight = this.measureArabicParagraphHeight(ra);
                    const copArHeight = this.measureArabicParagraphHeight(rb);
                    const copHeight = this.measureArabicParagraphHeight(rc);

                    const adjustedArHeight = arHeight / ratios[0];
                    const adjustedCopArHeight = copArHeight / ratios[1];
                    const adjustedCopHeight = copHeight / ratios[2];

                    const heights = [adjustedArHeight, adjustedCopArHeight, adjustedCopHeight];
                    const maxH = Math.max(...heights);
                    const minH = Math.min(...heights);
                    const heightDiff = maxH - minH;

                    if (heightDiff < minHeightDiff) {
                        minHeightDiff = heightDiff;
                        bestRatios = ratios;
                    }
                }
            }
            return bestRatios;
        }
    }

    /**
     * Measures the height of a row while applying specific percentage-based 
     * column widths. This is used for rendering balanced layouts.
     */
    public measureRowWithRatios(
        ar: string,
        copAr: string,
        cop: string,
        triple: boolean,
        ratios: number[]
    ): number {
        const ra = ar ?? '';
        const rb = copAr ?? '';
        const rc = cop ?? '';

        if (!triple) {
            const arRatio = ratios[0] * 100;
            const copArRatio = ratios[1] * 100;
            this.sandbox.innerHTML = `
                <div class="flex w-full flex-col gap-3 md:flex-row md:items-stretch md:gap-4" style="align-items: stretch;">
                    <div class="min-w-0 shrink-0 basis-full" style="flex-basis: ${arRatio}% !important;">
                        <p class="${P_RTL}" dir="rtl">${escapeHtml(ra)}</p>
                    </div>
                    <div class="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25" aria-hidden="true"></div>
                    <div class="min-w-0 shrink-0 basis-full" style="flex-basis: ${copArRatio}% !important;">
                        <p class="${P_COP_AR}" dir="rtl">${escapeHtml(rb)}</p>
                    </div>
                </div>
            `;
        } else {
            const arRatio = ratios[0] * 100;
            const copArRatio = ratios[1] * 100;
            const copRatio = ratios[2] * 100;
            this.sandbox.innerHTML = `
                <div class="flex w-full flex-col gap-3 md:flex-row md:items-stretch md:gap-4" style="align-items: stretch;">
                    <div class="min-w-0 shrink-0 basis-full" style="flex-basis: ${arRatio}% !important;">
                        <p class="${P_RTL}" dir="rtl">${escapeHtml(ra)}</p>
                    </div>
                    <div class="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25" aria-hidden="true"></div>
                    <div class="min-w-0 shrink-0 basis-full" style="flex-basis: ${copArRatio}% !important;">
                        <p class="${P_COP_AR}" dir="rtl">${escapeHtml(rb)}</p>
                    </div>
                    <div class="hidden md:block w-px shrink-0 self-stretch min-h-0 bg-black/25 dark:bg-white/25" aria-hidden="true"></div>
                    <div class="min-w-0 shrink-0 basis-full" style="flex-basis: ${copRatio}% !important;">
                        <p class="${P_COP_LTR}" dir="ltr">${escapeHtml(rc)}</p>
                    </div>
                </div>
            `;
        }

        return this.sandbox.scrollHeight;
    }

    /** 
     * Splits text into sentences by looking for Arabic/English punctuation 
     * and ensuring we don't break mid-sentence.
     */
    private splitIntoSentences(text: string): string[] {
        if (!text.trim()) return [];
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
     * Advanced row splitter that maintains horizontal synchronization across multiple columns.
     * Use this when a single liturgical block (e.g., a long prayer) exceeds the screen height. 
     * It splits into multiple sub-segments ensure each sub-row fits within maxHeightPx.
     */
    public splitFullRowSynchronizedWithRatios(
        ar: string,
        copAr: string,
        cop: string,
        triple: boolean,
        maxHeightPx: number,
        ratios: number[]
    ): MultiColumnRowSegment[] {
        const ra = ar ?? '';
        const rb = copAr ?? '';
        const rc = cop ?? '';

        const rowH = (a: string, b: string, c: string): number =>
            this.measureRowWithRatios(a, b, c, triple, ratios);

        // Calculate a safe capacity by subtracting a small 'slack' to account for line-height rounding
        const slack = Math.max(4, Math.ceil(this.fontSizePx * 0.1));
        const cap = Math.max(48, maxHeightPx - slack);

        // If it fits already, no split needed
        if (rowH(ra, rb, rc) <= cap) {
            return [{ ar: ra, copAr: rb, cop: rc }];
        }

        const splitBySentences = (text: string, targetChunks: number): string[] => {
            if (!text.trim()) return [text];

            const sentences = this.splitIntoSentences(text);
            if (sentences.length <= targetChunks) return [text];

            const chunks: string[] = [];
            const sentencesPerChunk = Math.ceil(sentences.length / targetChunks);

            for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
                const chunk = sentences.slice(i, i + sentencesPerChunk).join(' ');
                if (chunk.trim()) chunks.push(chunk);
            }

            return chunks.length > 0 ? chunks : [text];
        };

        // Determine how many chunks we need based on the longest column
        const arLength = this.getEffectiveTextLength(ra);
        const rbLength = this.getEffectiveTextLength(rb);
        const rcLength = triple ? this.getEffectiveTextLength(rc) : 0;
        const maxLength = Math.max(arLength, rbLength, rcLength);
        const targetChunks = Math.max(2, Math.min(8, Math.ceil(maxLength / 150)));

        let arChunks = splitBySentences(ra, targetChunks);
        let copArChunks = splitBySentences(rb, targetChunks);
        let copChunks = triple ? splitBySentences(rc, targetChunks) : [];

        const maxChunks = Math.max(arChunks.length, copArChunks.length, copChunks.length);

        const padToLength = (chunks: string[], len: number): string[] => {
            const padded = [...chunks];
            while (padded.length < len) padded.push('');
            return padded;
        };

        // Pad shorter columns with empty strings to keep row indices aligned
        arChunks = padToLength(arChunks, maxChunks);
        copArChunks = padToLength(copArChunks, maxChunks);
        if (triple) copChunks = padToLength(copChunks, maxChunks);

        const result: MultiColumnRowSegment[] = [];
        for (let i = 0; i < maxChunks; i++) {
            result.push({
                ar: arChunks[i],
                copAr: copArChunks[i],
                cop: triple ? copChunks[i] : '',
            });
        }

        return result;
    }

    /** Alias for measureArabicParagraphHeight used in generic pagination */
    public measureHeight(htmlContent: string): number {
        return this.measureArabicParagraphHeight(htmlContent);
    }

    /**
     * Standard pagination for single-column text (paragraphs). 
     * Accumulates tokens until they exceed the maxHeightPx, then starts a new page.
     */
    public paginate(text: string, maxHeightPx: number): string[] {
        if (!text) return [];

        const slack = Math.max(4, Math.ceil(this.fontSizePx * 0.12));
        const cap = Math.max(40, maxHeightPx - slack);

        const tokens = this.tokenize(text);
        const pages: string[] = [];
        let currentPageText = '';

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const testText = currentPageText ? `${currentPageText} ${token}` : token;
            const height = this.measureArabicParagraphHeight(testText);

            if (height > cap && currentPageText.length > 0) {
                pages.push(currentPageText.trim());
                currentPageText = token;
            } else {
                currentPageText = testText;
            }
        }

        if (currentPageText.trim()) {
            pages.push(currentPageText.trim());
        }

        return pages;
    }

    /**
     * The most sophisticated pagination method.
     * Uses an iterative binary-search style algorithm to find the exact proportional split 
     * point across all columns that fits within the height limit. 
     * 
     * This is used as a fallback when synchronized sentence-splitting isn't enough OR
     * for legacy splitting logic.
     */
    public splitOverflowRow(
        ar: string,
        copAr: string,
        cop: string,
        triple: boolean,
        maxHeightPx: number
    ): MultiColumnRowSegment[] {
        const ra = ar ?? '';
        const rb = copAr ?? '';
        const rc = cop ?? '';

        const rowH = (a: string, b: string, c: string): number =>
            triple && c.trim().length > 0
                ? this.measureTripleColumnRowHeight(a, b, c)
                : this.measureDualColumnRowHeight(a, b);

        const slack = Math.max(4, Math.ceil(this.fontSizePx * 0.1));
        const cap = Math.max(48, maxHeightPx - slack);

        if (rowH(ra, rb, rc) <= cap) {
            return [{ ar: ra, copAr: rb, cop: rc }];
        }

        /**
         * Iteratively tries to find a percentage (f) of the total text length 
         * that can fit in the current row.
         */
        const takeProportionalPrefix = (
            restA: string,
            restB: string,
            restC: string
        ): { pa: string; pb: string; pc: string } => {
            const la = restA.length;
            const lb = restB.length;
            const lc = triple ? restC.length : 0;

            let lo = 0.02;
            let hi = 1;
            let bestPa = '';
            let bestPb = '';
            let bestPc = '';

            // Binary search for the maximum prefix length (by percentage)
            for (let iter = 0; iter < 48 && hi - lo > 0.0005; iter++) {
                const f = (lo + hi) / 2;
                let na = Math.min(la, Math.max(0, Math.floor(f * la)));
                let nb = Math.min(lb, Math.max(0, Math.floor(f * lb)));
                let nc = triple ? Math.min(lc, Math.max(0, Math.floor(f * lc))) : 0;

                if (la > 0) {
                    na = snapPrefixToWordBoundary(restA, na);
                    if (na === 0 && f > 0.05) na = Math.min(la, 1);
                }
                
                // Keep scripts in sync: if AR cuts at 50%, try to cut others around 50%
                const ratio = la > 0 ? na / la : f;
                nb = Math.min(lb, Math.max(0, Math.round(lb * ratio)));
                nb = snapPrefixToWordBoundary(restB, nb);
                nc = triple ? Math.min(lc, Math.max(0, Math.round(lc * ratio))) : 0;
                if (triple && lc > 0) nc = snapPrefixToWordBoundary(restC, nc);

                const pa = restA.slice(0, na);
                const pb = restB.slice(0, nb);
                const pc = triple ? restC.slice(0, nc) : '';

                if (rowH(pa, pb, pc) <= cap) {
                    bestPa = pa;
                    bestPb = pb;
                    bestPc = pc;
                    lo = f;
                } else {
                    hi = f;
                }
            }

            // Absolute fallback: take at least one word/character if everything fails
            if (bestPa.length === 0 && bestPb.length === 0 && bestPc.length === 0) {
                let na = snapPrefixToWordBoundary(restA, 1) || Math.min(1, la);
                let nb = lb > 0 ? (snapPrefixToWordBoundary(restB, 1) || 1) : 0;
                let nc = (triple && lc > 0) ? (snapPrefixToWordBoundary(restC, 1) || 1) : 0;
                
                return {
                    pa: restA.slice(0, na),
                    pb: restB.slice(0, nb),
                    pc: triple ? restC.slice(0, nc) : '',
                };
            }

            return { pa: bestPa, pb: bestPb, pc: bestPc };
        };

        const out: MultiColumnRowSegment[] = [];
        let restA = ra;
        let restB = rb;
        let restC = rc;
        let guard = 0; // Infinite loop safety

        while ((restA.trim() || restB.trim() || restC.trim()) && guard++ < 400) {
            if (rowH(restA, restB, restC) <= cap) {
                out.push({ ar: restA, copAr: restB, cop: restC });
                break;
            }

            let { pa, pb, pc } = takeProportionalPrefix(restA, restB, restC);

            // Final micro-adjustment to ensure the selected prefix REALLY fits
            while (
                (pa.length > 0 || pb.length > 0 || pc.length > 0) &&
                rowH(pa, pb, pc) > cap
            ) {
                if (pa.length >= pb.length && pa.length >= pc.length && pa.length > 0) {
                    pa = pa.slice(0, -1);
                } else if (pb.length >= pc.length && pb.length > 0) {
                    pb = pb.slice(0, -1);
                } else if (pc.length > 0) {
                    pc = pc.slice(0, -1);
                } else {
                    break;
                }
            }

            if (pa.length === 0 && pb.length === 0 && pc.length === 0) {
                out.push({ ar: restA.slice(0, 1), copAr: restB.slice(0, 1), cop: triple ? restC.slice(0, 1) : '' });
                restA = restA.slice(1).trimStart();
                restB = restB.slice(1).trimStart();
                restC = triple ? restC.slice(1).trimStart() : '';
                continue;
            }

            out.push({ ar: pa, copAr: pb, cop: pc });
            restA = restA.slice(pa.length).trimStart();
            restB = restB.slice(pb.length).trimStart();
            restC = triple ? restC.slice(pc.length).trimStart() : '';
        }

        return out.length > 0 ? out : [{ ar: ra, copAr: rb, cop: rc }];
    }
}
