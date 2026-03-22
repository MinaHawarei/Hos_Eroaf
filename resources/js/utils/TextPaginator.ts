/**
 * Measures rendered text height and splits long blocks into pages that fit a max height.
 */

import { PRES_BODY_LEADING_CLASS } from '@/utils/presentationLayout';

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
        this.sandbox.style.padding = '0 1rem';
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
            <p class="pres-slide-body-text ${PRES_BODY_LEADING_CLASS} font-reading font-bold text-foreground">
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
                    <p class="pres-slide-body-text ${PRES_BODY_LEADING_CLASS} text-foreground font-reading font-bold text-justified" dir="rtl">${escapeHtml(ar)}</p>
                </div>
                <div class="min-w-0 shrink-0 basis-full md:basis-[60%]">
                    <p class="pres-slide-body-text ${PRES_BODY_LEADING_CLASS} font-reading font-bold text-justified !text-[#880808] dark:!text-sky-400" dir="rtl">${escapeHtml(copAr)}</p>
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
                    <p class="pres-slide-body-text ${PRES_BODY_LEADING_CLASS} text-foreground font-reading font-bold text-justified" dir="rtl">${escapeHtml(ar)}</p>
                </div>
                <div class="min-w-0 shrink-0 basis-full md:basis-[35%]">
                    <p class="pres-slide-body-text ${PRES_BODY_LEADING_CLASS} font-reading font-bold text-justified !text-[#880808] dark:!text-sky-400" dir="rtl">${escapeHtml(copAr)}</p>
                </div>
                <div class="min-w-0 shrink-0 basis-full md:basis-[35%]">
                    <p class="pres-slide-body-text ${PRES_BODY_LEADING_CLASS} text-foreground font-reading font-bold" dir="ltr">${escapeHtml(cop)}</p>
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

        const tokens = this.tokenize(text);
        const pages: string[] = [];
        let currentPageText = '';

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const testText = currentPageText ? `${currentPageText} ${token}` : token;

            const height = this.measureArabicParagraphHeight(testText);

            if (height > maxHeightPx && currentPageText.length > 0) {
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
}
