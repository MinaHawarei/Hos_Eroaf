<?php

namespace App\Helpers;

class ArabicNormalizer
{
    /**
     * Normalize Arabic text for precise and flexible searching.
     * Handles:
     * - Removal of Tashkeel (diacritics)
     * - Normalization of Hamza forms to plain Alif
     * - Normalization of Ya/Alif Maqsura
     * - Normalization of Ta Marbuta to Ha
     * - Removal of Tatweel
     */
    public static function normalize(string $text): string
    {
        if (empty($text)) {
            return '';
        }

        // 1. Remove Tashkeel (Arabic Diacritics)
        $tashkeel = [
            '/[ًٌٍَُِّْـ]/u' // Fatha, Fathatan, Damma, Dammatan, Kasra, Kasratan, Shadda, Sukun, Tatweel
        ];
        $text = preg_replace($tashkeel, '', $text);

        // 2. Normalize Hamzas to Alif
        $hamzas = [
            '/[إأٱآا]/u' => 'ا',
            '/[ؤ]/u' => 'و',
            '/[ئ]/u' => 'ي',
        ];
        $text = preg_replace(array_keys($hamzas), array_values($hamzas), $text);

        // 3. Normalize Ya / Alif Maqsura
        $text = preg_replace('/[ىي]/u', 'ي', $text);

        // 4. Normalize Ta Marbuta to Ha
        $text = preg_replace('/[ة]/u', 'ه', $text);

        // 5. Trim and normalize spaces
        $text = trim(preg_replace('/\s+/u', ' ', $text));

        return $text;
    }
}
