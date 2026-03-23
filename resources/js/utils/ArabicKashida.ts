/**
 * Utility to intelligently add Arabic Kashida (Tatweel) characters
 * to elongate words and improve text aesthetics.
 */

// Characters that can connect to the next character (thus can have a kashida after them)
// Includes letters that are not the "stubborn" ones (ا د ذ ر ز و)
const CONNECTING_CHARS = /[بتثجحخسشصضطظعغفقكلمنهي]/;

// Points where we should NOT insert a kashida:
// 1. After Alef, Dal, Thal, Ra, Zain, Waw (non-connecting)
// 2. At the end of a word
// 3. After a character that's already a kashida
const NON_CONNECTING = /[ادذرزوؤإأآةء]/;

/**
 * Deterministically adds kashida characters to Arabic text.
 */
export function applyKashida(text: string, amount: number = 2): string {
    if (!text || !/[\u0600-\u06FF]/.test(text)) return text; // Skip if no Arabic chars

    const words = text.split(/(\s+)/);
    
    return words.map(word => {
        // Skip whitespace segments, very short words, or non-Arabic words
        if (word.trim().length < 3 || !/[\u0600-\u06FF]/.test(word)) return word;

        // Use a simple hash of the word to decide WHERE to put kashidas
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i);
            hash |= 0;
        }

        const chars = word.split('');
        let result = '';
        
        for (let i = 0; i < chars.length; i++) {
            result += chars[i];
            
            // Add kashida if:
            // 1. Not the last character
            // 2. Character is a connecting one
            // 3. Not after a non-connecting character
            if (i < chars.length - 1 && CONNECTING_CHARS.test(chars[i]) && !NON_CONNECTING.test(chars[i])) {
                // Use hash to decide if we elongate here
                // Higher hash value means more likely to stretch
                if ((hash + i) % 4 === 0) {
                    result += 'ـ'.repeat(amount);
                }
            }
        }
        return result;
    }).join('');
}
