/**
 * Measures rendered text height and splits long blocks into pages that fit a max height.
 */

import type { MultiColumnRowSegment } from '@/utils/computeSlidePages';
import { PRES_BODY_LEADING_CLASS } from '@/utils/presentationLayout';

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Matches SplitViewReader horizontal padding (`px-8` / `px-10`). */
const SANDBOX_PAD_X = '1.5rem';

const P_RTL = `pres-slide-body-text ${PRES_BODY_LEADING_CLASS} text-foreground font-reading font-bold break-words text-justify pres-arabic-justify`;
const P_COP_AR = `pres-slide-body-text ${PRES_BODY_LEADING_CLASS} font-reading font-bold break-words text-justify pres-arabic-justify !text-[#880808] dark:!text-sky-400`;
const P_COP_LTR = `pres-slide-body-text ${PRES_BODY_LEADING_CLASS} text-foreground font-reading font-bold break-words text-justify pres-ltr-justify`;

function snapPrefixToWordBoundary(full: string, endIndex: number): number {
    if (endIndex <= 0) {
        return 0;
    }
    if (endIndex >= full.length) {
        return full.length;
    }
    const sub = full.slice(0, endIndex);
    const sp = sub.lastIndexOf(' ');
    const nbSp = sub.lastIndexOf('\u00a0');
    const cut = Math.max(sp, nbSp);
    if (cut >= Math.floor(endIndex * 0.3)) {
        return cut + 1;
    }
    return endIndex;
}

export class TextPaginator {
    private sandbox: HTMLDivElement;

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
        this.setContentWidth(
            contentWidthPx ?? (typeof window !== 'undefined' ? window.innerWidth - 48 : 1100)
        );
        document.body.appendChild(this.sandbox);
    }

    public setFontSize(px: number): void {
        this.fontSizePx = px;
        this.sandbox.style.setProperty('--pres-font-size', `${px}px`);
    }

    /**
     * Match live slide content width (minus horizontal padding) so wrapping matches the reader.
     */
    public setContentWidth(px: number): void {
        const w = Math.max(240, Math.floor(px));
        this.sandbox.style.width = `${w}px`;
        this.sandbox.style.maxWidth = 'none';
    }

    public cleanup(): void {
        if (this.sandbox.parentNode) {
            this.sandbox.parentNode.removeChild(this.sandbox);
        }
    }

    /**
     * Splits text by paragraphs or sentence-like boundaries.
     */
    private tokenize(text: string): string[] {
        if (!text) {
            return [];
        }
        let tokens = text.split(/(\n\n|<br\s*\/?>\s*<br\s*\/?>)/i);
        tokens = tokens.filter(Boolean);

        const result: string[] = [];

        for (const token of tokens) {
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

    /**
     * Measure height of a single Arabic-only paragraph (matches SplitViewReader single column).
     */
    public measureArabicParagraphHeight(textContent: string): number {
        this.sandbox.innerHTML = `
            <p class="${P_RTL}" dir="rtl">
                ${escapeHtml(textContent)}
            </p>
        `;
        return this.sandbox.scrollHeight;
    }

    /**
     * Arabic + Coptic Arabized row — flex 40% / 60% (md+).
     */
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

    /**
     * Full tri-column row — 30% / 35% / 35% (md+).
     */
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
     * @deprecated Prefer measureArabicParagraphHeight / column row helpers for accuracy.
     */
    public measureHeight(htmlContent: string): number {
        return this.measureArabicParagraphHeight(htmlContent);
    }

    /**
     * Split raw text into chunks that each fit within maxHeightPx when rendered as a body paragraph.
     */
    public paginate(text: string, maxHeightPx: number): string[] {
        if (!text) {
            return [];
        }

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
     * Split one logical multi-column row into segments that each fit within maxHeightPx.
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

            for (let iter = 0; iter < 48 && hi - lo > 0.0005; iter++) {
                const f = (lo + hi) / 2;
                let na = Math.min(la, Math.max(0, Math.floor(f * la)));
                let nb = Math.min(lb, Math.max(0, Math.floor(f * lb)));
                let nc = triple ? Math.min(lc, Math.max(0, Math.floor(f * lc))) : 0;

                if (la > 0) {
                    na = snapPrefixToWordBoundary(restA, na);
                    if (na === 0 && f > 0.05) {
                        na = Math.min(la, 1);
                    }
                }
                const ratio = la > 0 ? na / la : f;
                nb = Math.min(lb, Math.max(0, Math.round(lb * ratio)));
                nb = snapPrefixToWordBoundary(restB, nb);
                nc = triple ? Math.min(lc, Math.max(0, Math.round(lc * ratio))) : 0;
                if (triple && lc > 0) {
                    nc = snapPrefixToWordBoundary(restC, nc);
                }

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

            if (bestPa.length === 0 && bestPb.length === 0 && bestPc.length === 0) {
                let na = snapPrefixToWordBoundary(restA, 1);
                if (na === 0) {
                    na = Math.min(1, la);
                }
                let nb = lb > 0 ? snapPrefixToWordBoundary(restB, 1) : 0;
                if (nb === 0 && lb > 0) {
                    nb = 1;
                }
                let nc = triple && lc > 0 ? snapPrefixToWordBoundary(restC, 1) : 0;
                if (nc === 0 && triple && lc > 0) {
                    nc = 1;
                }
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
        let guard = 0;

        while ((restA.trim() || restB.trim() || restC.trim()) && guard++ < 400) {
            if (rowH(restA, restB, restC) <= cap) {
                out.push({ ar: restA, copAr: restB, cop: restC });
                break;
            }

            let { pa, pb, pc } = takeProportionalPrefix(restA, restB, restC);

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
                const takeA = restA.slice(0, 1);
                const takeB = restB.slice(0, 1);
                const takeC = triple ? restC.slice(0, 1) : '';
                out.push({ ar: takeA, copAr: takeB, cop: takeC });
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

        if (out.length === 0) {
            return [{ ar: ra, copAr: rb, cop: rc }];
        }

        return out;
    }
}
