<?php

namespace App\Services;

class TranscriptNormalizationService
{
    /**
     * Normalize Arabic/Coptic-Arabized text for matching.
     */
    public function normalize(string $text): string
    {
        // 1. Remove Arabic diacritics (Tashkeel)
        $text = preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $text);

        // 2. Unify Alif variants (إ، أ، آ) -> ا
        $text = preg_replace('/[إأآ]/u', 'ا', $text);

        // 3. Unify Taa Marbuta (ة) -> ه
        $text = str_replace('ة', 'ه', $text);

        // 4. Unify Yaa (ى) -> ي
        $text = str_replace('ى', 'ي', $text);

        // 5. Remove punctuation and special characters
        $text = preg_replace('/[،؛؟\.,:;!?\-\(\)\[\]«»"\']/u', '', $text);

        // 6. Collapse multiple spaces into one
        $text = preg_replace('/\s+/u', ' ', $text);

        return trim($text);
    }
}
