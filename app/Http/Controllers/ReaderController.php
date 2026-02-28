<?php

namespace App\Http\Controllers;

use App\Models\ReadingDay;
use App\Models\ReadingSection;
use App\Services\ReadingResolverService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReaderController extends Controller
{
    public function __construct(
        private readonly ReadingResolverService $resolver,
    ) {}

    public function show(Request $request, string $dayKey): \Illuminate\Http\RedirectResponse|\Inertia\Response
    {
        $readingDay = ReadingDay::where('date_key', $dayKey)->first();

        if (!$readingDay) {
            try {
                $dayData = $this->resolver->resolveForDate(Carbon::createFromFormat('Y-m-d', $dayKey));
            } catch (\Exception $e) {
                return redirect()->route('home');
            }

            return Inertia::render('Reader', [
                'dayKey' => $dayKey,
                'copticDate' => $dayData->copticFormatted ?? '',
                'season' => $dayData->season ?? '',
                'seasonLabel' => $dayData->seasonLabel ?? '',
                'sections' => [],
                'activeSection' => '',
            ]);
        }

        // Load sections with their readings and lines
        $sections = ReadingSection::orderBy('order')
            ->get()
            ->map(function (ReadingSection $section) use ($readingDay) {
                $readings = $readingDay->readings()
                    ->where('section_id', $section->id)
                    ->with(['lines' => fn ($q) => $q->orderBy('line_order')])
                    ->get();

                return [
                    'id' => $section->id,
                    'code' => $section->code,
                    'name_ar' => $section->name_ar,
                    'readings' => $readings->map(fn ($r) => [
                        'id' => $r->id,
                        'title_ar' => $r->title_ar,
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

        // Resolve today's info for breadcrumb context
        $dayData = $this->resolver->resolveForDate(
            Carbon::createFromFormat('Y-m-d', $readingDay->date_key) ?? Carbon::today()
        );

        return Inertia::render('Reader', [
            'dayKey' => $dayKey,
            'copticDate' => $dayData->copticFormatted,
            'season' => $dayData->season,
            'seasonLabel' => $dayData->seasonLabel,
            'sections' => $sections,
            'activeSection' => $request->query('section', $sections->first()['code'] ?? ''),
        ]);
    }
}
