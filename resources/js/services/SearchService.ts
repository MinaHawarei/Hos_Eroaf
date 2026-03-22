/**
 * SearchService handles diacritic-insensitive (Tashkeel) Arabic search.
 * It strictly ignores diacritics and normalizes Alef variations and Teh Marbutas.
 */

export class SearchService {
    /**
     * Normalizes an Arabic string for search comparison.
     * Actions performed:
     * 1. Strip all Tashkeel (Arabic diacritics).
     * 2. Unify Alef forms (أ, إ, آ, ا) to bare Alef (ا).
     * 3. Unify Teh Marbuta (ة) to Heh (ه).
     * 4. Unify Alef Maksura (ى) to Yeh (ي).
     */
    public static normalizeArabic(str: string): string {
        if (!str) return '';

        let normalized = str;
        
        // Strip Tashkeel (Fatha, Damma, Kasra, Sukun, Shadda, Tanween, etc)
        // Range \u064B to \u065F covers standard Arabic diacritics
        normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');

        // Unify Alefs
        normalized = normalized.replace(/[أإآ]/g, 'ا');

        // Unify Teh Marbuta to Heh
        normalized = normalized.replace(/ة/g, 'ه');

        // Unify Alef Maksura to Yeh
        normalized = normalized.replace(/ى/g, 'ي');

        return normalized.toLowerCase(); // Also lowercase for english fallbacks
    }

    /**
     * Checks if the query matches the content.
     */
    public static isMatch(query: string, content: string): boolean {
        const normQuery = this.normalizeArabic(query);
        if (!normQuery) return false;
        
        const normContent = this.normalizeArabic(content);
        return normContent.includes(normQuery);
    }

    /**
     * Surrounds the matched portion of the ORIGINAL text with a highlight tag.
     * Retains original Tashkeel visually.
     */
    public static highlightMatch(query: string, originalText: string): string {
        if (!query.trim() || !originalText) return originalText;

        const normQuery = this.normalizeArabic(query);
        if (!normQuery) return originalText;

        // Since the original string has diacritics, simple string.replace with string index won't work
        // Instead, we build a regex that matches the characters of the query while optionally matching any diacritic between them.
        const queryChars = normQuery.split('');
        
        // Escape regex special chars
        const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build a massive regex that inserts optional diacritic matching between every char
        // Also map Alef to allowing any Alef variation, etc.
        const regexParts = queryChars.map(char => {
            if (char === 'ا') {
                return '[اأإآ]';
            }
            if (char === 'ه') {
                return '[ههة]';
            }
            if (char === 'ي') {
                return '[ييى]';
            }
            if (char === ' ') {
                return '\\s+';
            }
            return escapeRegExp(char);
        });

        // The join allows any sequence of diacritics between matching characters
        const diacriticsRegex = '[\\u064B-\\u065F\\u0670]*';
        const searchPattern = regexParts.join(diacriticsRegex) + diacriticsRegex;

        try {
            const regex = new RegExp(`(${searchPattern})`, 'gi');
            return originalText.replace(regex, '<mark class="bg-yellow-300/50 text-foreground px-1 rounded">$1</mark>');
        } catch (e) {
            // Fallback in case regex construction fails
            return originalText;
        }
    }
}
