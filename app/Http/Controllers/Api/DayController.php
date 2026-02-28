<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReadingDay;
use App\Models\ReadingSection;
use App\Services\ReadingResolverService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class DayController extends Controller
{
    public function __construct(
        private readonly ReadingResolverService $resolver,
    ) {}

    public function show(string $date): JsonResponse
    {
        try {
            $carbonDate = Carbon::createFromFormat('Y-m-d', $date);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid date format. Use YYYY-MM-DD.'], 400);
        }

        $dayData = $this->resolver->resolveForDate($carbonDate);
        
        $readingDay = ReadingDay::where('date_key', $dayData->dateKey)->first();
        
        $sections = [];
        if ($readingDay) {
            $sections = ReadingSection::orderBy('order')
                ->get()
                ->map(function (ReadingSection $section) use ($readingDay) {
                    $readings = $readingDay->readings()
                        ->where('section_id', $section->id)
                        ->orderBy('sequence_order')
                        ->with(['lines' => fn ($q) => $q->orderBy('line_order')])
                        ->get();

                    return [
                        'id' => $section->id,
                        'code' => $section->code,
                        'name_ar' => $section->name_ar,
                        'readings' => $readings->map(fn ($r) => [
                            'id' => $r->id,
                            'title_ar' => $r->title_ar,
                            'sequence_order' => $r->sequence_order,
                            'has_coptic' => (bool) $r->has_coptic,
                            'lines' => $r->lines->map(fn ($l) => [
                                'id' => $l->id,
                                'lang_type' => $l->lang_type,
                                'line_order' => $l->line_order,
                                'text' => $l->text,
                            ])->values(),
                        ])->values(),
                    ];
                })
                ->filter(fn ($s) => $s['readings']->isNotEmpty())
                ->values();
        }

        return response()->json([
            'dayKey' => $dayData->dateKey,
            'copticDate' => $dayData->copticFormatted,
            'season' => $dayData->season,
            'seasonLabel' => $dayData->seasonLabel,
            'sections' => $sections,
        ]);
    }
}
