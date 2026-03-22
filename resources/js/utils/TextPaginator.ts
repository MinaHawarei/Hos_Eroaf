/**
 * TextPaginator.ts
 * Utility to calculate rendered text height and split into pages if it exceeds max height (e.g. 85vh).
 */

export class TextPaginator {
    private sandbox: HTMLDivElement;

    constructor(private className: string = 'slide-content-enter') {
        this.sandbox = document.createElement('div');
        this.sandbox.style.position = 'absolute';
        this.sandbox.style.visibility = 'hidden';
        this.sandbox.style.pointerEvents = 'none';
        this.sandbox.style.top = '-9999px';
        this.sandbox.style.left = '-9999px';
        
        // Match the typical presentation main layout width constraint
        this.sandbox.style.width = '100%';
        this.sandbox.style.maxWidth = '1280px'; // max-w-7xl
        this.sandbox.style.padding = '2rem';
        this.sandbox.className = this.className;

        document.body.appendChild(this.sandbox);
    }

    public cleanup() {
        if (this.sandbox.parentNode) {
            this.sandbox.parentNode.removeChild(this.sandbox);
        }
    }

    /**
     * Splits text intelligently by paragraphs (\n\n) or sentences (.،!?),
     * ensuring HTML tags are never broken.
     */
    private tokenize(text: string): string[] {
        if (!text) return [];
        // First split by paragraphs
        let tokens = text.split(/(\n\n|<br\s*\/?>\s*<br\s*\/?>)/i);
        // Clean up undefined captures
        tokens = tokens.filter(Boolean);

        const result: string[] = [];
        let buffer = '';

        for (const token of tokens) {
            // Group HTML tags or sentences. 
            // If token is very long, split by sentences.
            if (token.length > 500 && !/<[a-z][\s\S]*>/i.test(token)) {
                // Approximate sentence boundaries in Arabic/English
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
        return result.filter(t => t.trim().length > 0);
    }

    /**
     * Measure height of HTML content inside the sandbox.
     */
    private measureHeight(htmlContent: string): number {
        // Wrap in the same structure as SplitViewReader roughly for accurate sizing
        this.sandbox.innerHTML = `
            <p class="text-3xl md:text-5xl lg:text-6xl leading-[1.8] font-reading font-bold" style="font-size: var(--pres-font-size, 28px);">
                ${htmlContent}
            </p>
        `;
        return this.sandbox.clientHeight;
    }

    /**
     * Takes raw HTML text and splits it into multiple HTML strings
     * where each string renders within `maxHeightPx`.
     */
    public paginate(text: string, maxHeightPx: number): string[] {
        if (!text) return [];

        const tokens = this.tokenize(text);
        const pages: string[] = [];
        let currentPageText = '';

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const testText = currentPageText ? currentPageText + ' ' + token : token;

            const height = this.measureHeight(testText);

            if (height > maxHeightPx && currentPageText.length > 0) {
                // Test text is too big, push current and start new page
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
