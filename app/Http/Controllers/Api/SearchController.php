<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReadingLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $query = $request->query('q', '');
        
        if (empty($query) || mb_strlen($query) < 3) {
            return response()->json(['results' => []]);
        }

        $normalizedQuery = \App\Helpers\ArabicNormalizer::normalize($query);

        // Search reading lines
        $results = ReadingLine::with(['reading.section', 'reading.readingDay'])
            ->where('normalized_text', 'LIKE', '%' . $normalizedQuery . '%')
            ->orWhere('text', 'LIKE', '%' . $query . '%')
            ->limit(50)
            ->get();

        $formattedResults = $results->map(function ($line) {
            return [
                'id' => $line->id,
                'text' => $line->text,
                'reading_id' => $line->reading_id,
                'reading_title' => $line->reading->title_ar ?? '',
                'section_code' => $line->reading->section->code ?? '',
                'section_name' => $line->reading->section->name_ar ?? '',
                'date_key' => $line->reading->readingDay->date_key ?? '',
            ];
        });

        // Group by section code
        $grouped = $formattedResults->groupBy('section_code');

        return response()->json(['results' => $grouped]);
    }
}
