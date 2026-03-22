<?php

namespace App\Support;

use Illuminate\Support\Collection;

/**
 * Builds normalized line arrays for presentation from lectionary / liturgy reading payloads.
 */
final class ReadingLineAssembler
{
    /**
     * @return array<int, array{id: int, lang_type: string, text: string, speaker?: string|null}>
     */
    public static function buildLines(array $reading): array
    {
        $lines = [];
        $lineOrder = 0;
        $speaker = $reading['speaker'] ?? null;

        $textAr = $reading['text_ar'] ?? [];
        $textCo = $reading['text_co'] ?? [];
        $textArCo = $reading['text_ar_co'] ?? [];

        $maxLines = max(count($textAr), count($textCo), count($textArCo));

        for ($i = 0; $i < $maxLines; $i++) {
            $arText = $textAr[$i] ?? '';
            $coText = $textCo[$i] ?? '';
            $arCoText = $textArCo[$i] ?? '';

            if (! empty($arText)) {
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'arabic',
                    'text' => $arText,
                    'speaker' => $speaker,
                ];
            }

            if (! empty($arCoText)) {
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'coptic_arabized',
                    'text' => $arCoText,
                    'speaker' => $speaker,
                ];
            }

            if (! empty($coText)) {
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'coptic',
                    'text' => $coText,
                    'speaker' => $speaker,
                ];
            }
        }

        return $lines;
    }

    public static function readingHasCoptic(array $lines): bool
    {
        return Collection::make($lines)->contains('lang_type', 'coptic_arabized');
    }
}
