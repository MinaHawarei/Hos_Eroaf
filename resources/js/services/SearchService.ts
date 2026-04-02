/**
 * SearchService
 * 
 * Provides utilities for diacritic-insensitive (Tashkeel) Arabic search.
 * It normalizes orthographic variations (Alef types, Teh Marbuta vs Heh, 
 * Alef Maksura vs Yeh) and strips all diacritics to ensure a robust 'fuzzy' 
 * matching experience for liturgical content.
 */

export class SearchService {
    /**
     * Normalizes an Arabic string for search comparison by stripping diacritics 
     * and unifying similar-looking characters.
     * 
     * Normalization rules:
     * 1. Strip Tashkeel (Range \u064B to \u065F) and Kashida (\u0640).
     * 2. Unify all Alef forms (أ, إ, آ, ا) to a bare Alef (ا).
     * 3. Unify Teh Marbuta (ة) to Heh (ه).
     * 4. Unify Alef Maksura (ى) to Yeh (ي).
     * 
     * @param str - The raw Arabic string.
     * @returns The normalized, simplified string for comparison.
     */
    public static normalizeArabic(str: string): string {
        if (!str) return '';

        let normalized = str;
        
        // Strip Tashkeel (diacritics) and Kashida (tatweel)
        // \u0640 is Kashida, range \u064B to \u065F is diacritics
        normalized = normalized.replace(/[\u0640\u064B-\u065F\u0670]/g, '');

        // Unify Alefs
        normalized = normalized.replace(/[أإآ]/g, 'ا');

        // Unify Teh Marbuta to Heh
        normalized = normalized.replace(/ة/g, 'ه');

        // Unify Alef Maksura to Yeh
        normalized = normalized.replace(/ى/g, 'ي');

        return normalized.toLowerCase();
    }

    /**
     * Checks if a search query matches a piece of content, ignoring Arabic diacritics.
     * 
     * @param query - The user's input.
     * @param content - The original text to search within.
     * @returns True if a match is found.
     */
    public static isMatch(query: string, content: string): boolean {
        const normQuery = this.normalizeArabic(query);
        if (!normQuery) return false;
        
        const normContent = this.normalizeArabic(content);
        return normContent.includes(normQuery);
    }

    /**
     * Highlights search matches within the ORIGINAL text, preserving all original 
     * diacritics and formatting visually.
     * 
     * Mechanism:
     * It constructs a complex regular expression that inserts an optional diacritic 
     * matcher between every character of the query. This allows the search to 
     * 'skip over' diacritics in the original text.
     * 
     * @param query - The normalized search query.
     * @param originalText - The raw text with diacritics.
     * @returns HTML string with <mark> tags around matches.
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

        // The join allows any sequence of diacritics/kashida between matching characters
        const diacriticsRegex = '[\\u0640\\u064B-\\u065F\\u0670]*';
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
