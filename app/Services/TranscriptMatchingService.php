<?php

namespace App\Services;

use App\Models\ReadingLine;
use Illuminate\Support\Collection;

class TranscriptMatchingService
{
    /**
     * @param string $transcript The normalized transcript from STT
     * @param Collection<ReadingLine> $lines Potential lines to match against
     * @return array{lineId: int|null, mode: string, confidence: float}
     */
    public function findBestMatch(string $transcript, Collection $lines): array
    {
        if (empty($transcript)) {
            return ['lineId' => null, 'mode' => 'arabic', 'confidence' => 0];
        }

        $bestMatch = null;
        $highestScore = 0;
        $detectedMode = 'arabic';

        foreach ($lines as $line) {
            $score = $this->calculateSimilarity($transcript, $line->normalized_text);
            
            if ($score > $highestScore) {
                $highestScore = $score;
                $bestMatch = $line;
                $detectedMode = $line->lang_type;
            }
        }

        // Confidence threshold
        if ($highestScore < 0.2) {
            return ['lineId' => null, 'mode' => $detectedMode, 'confidence' => $highestScore];
        }

        return [
            'lineId' => $bestMatch?->id,
            'mode' => $detectedMode,
            'confidence' => $highestScore
        ];
    }

    private function calculateSimilarity(string $source, string $target): float
    {
        if ($source === $target) return 1.0;
        
        $lev = levenshtein($source, $target);
        $maxLen = max(mb_strlen($source), mb_strlen($target));
        
        if ($maxLen === 0) return 0;
        
        return 1 - ($lev / $maxLen);
    }
}
