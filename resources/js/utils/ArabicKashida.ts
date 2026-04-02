/**
 * Utility to intelligently add Arabic Kashida (Tatweel) characters
 * to elongate words and improve text aesthetics.
 */

// Arabic characters that can connect to the following letter (thus a kashida/tatweel can be inserted after them)
// Excludes 'stubborn' letters that never connect to the left (ا د ذ ر ز و)
const CONNECTING_CHARS = /[بتثجحخسشصضطظعغفقكلمنهي]/;

// Characters that do NOT connect to the next letter or are special cases:
// 1. Alef, Dal, Thal, Ra, Zain, Waw (non-connecting to the left)
// 2. Hamza variations that are typically terminal or isolated
const NON_CONNECTING = /[ادذرزوؤإأآةء]/;

/**
 * Deterministically adds Arabic Kashida (Tatweel) characters to elongate words.
 * This improves the visual 'fullness' and aesthetics of justified Arabic text.
 * 
 * @param text - The Arabic string to process.
 * @param amount - Number of kashida characters (ـ) to insert at each valid point.
 * @returns The elongated Arabic string.
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
