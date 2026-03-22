/**
 * Measures rendered text height and splits long blocks into pages that fit a max height.
 */

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export class TextPaginator {
    private sandbox: HTMLDivElement;

    public constructor(
        private className: string = 'slide-content-enter',
        private fontSizePx: number = 28
    ) {
        this.sandbox = document.createElement('div');
        this.sandbox.style.position = 'absolute';
        this.sandbox.style.visibility = 'hidden';
        this.sandbox.style.pointerEvents = 'none';
        this.sandbox.style.top = '-9999px';
        this.sandbox.style.left = '-9999px';
        this.sandbox.style.width = '100%';
        this.sandbox.style.maxWidth = '1280px';
        this.sandbox.style.padding = '2rem';
        this.sandbox.className = this.className;
        this.sandbox.style.setProperty('--pres-font-size', `${this.fontSizePx}px`);

        document.body.appendChild(this.sandbox);
    }

    public setFontSize(px: number): void {
        this.fontSizePx = px;
        this.sandbox.style.setProperty('--pres-font-size', `${px}px`);
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
     * Measure height of a single Arabic-only paragraph (matches SplitViewReader).
     */
    public measureArabicParagraphHeight(textContent: string): number {
        this.sandbox.innerHTML = `
            <p class="pres-slide-body-text leading-[1.8] font-reading font-bold text-foreground">
                ${escapeHtml(textContent)}
            </p>
        `;
        return this.sandbox.scrollHeight;
    }

    /**
     * Measure height of a triple-column row (matches SplitViewReader coptic layout).
     */
    public measureTripleColumnRowHeight(ar: string, copAr: string, cop: string): number {
        this.sandbox.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-stretch w-full">
                <div class="flex-1 w-full">
                    <p class="pres-slide-body-text leading-[1.6] text-foreground font-reading font-bold text-justified" dir="rtl">${escapeHtml(ar)}</p>
                </div>
                <div class="flex-1 w-full">
                    <p class="pres-slide-body-text leading-[1.6] font-reading font-bold text-justified !text-[#880808] dark:!text-sky-400" dir="rtl">${escapeHtml(copAr)}</p>
                </div>
                <div class="flex-1 w-full">
                    <p class="pres-slide-body-text leading-[1.6] text-foreground font-reading font-bold" dir="ltr">${escapeHtml(cop)}</p>
                </div>
            </div>
        `;
        return this.sandbox.scrollHeight;
    }

    /**
     * @deprecated Prefer measureArabicParagraphHeight / measureTripleColumnRowHeight for accuracy.
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
