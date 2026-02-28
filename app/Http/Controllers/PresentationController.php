<?php

namespace App\Http\Controllers;

use App\Models\ReadingDay;
use App\Models\ReadingSection;
use App\Services\ReadingResolverService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PresentationController extends Controller
{
    public function __construct(
        private readonly ReadingResolverService $resolver,
    ) {}

    public function show(Request $request, string $dayKey): \Illuminate\Http\RedirectResponse|\Inertia\Response
    {
        $readingDay = ReadingDay::where('date_key', $dayKey)->first();

        if (!$readingDay) {
            // Try to resolve basic info so the frontend empty state has valid headers
            try {
                $dayData = $this->resolver->resolveForDate(Carbon::createFromFormat('Y-m-d', $dayKey));
            } catch (\Exception $e) {
                // If malformed, simply redirect to dashboard
                return redirect()->route('home');
            }

            return Inertia::render('PresentationPage', [
                'dayKey' => $dayKey,
                'copticDate' => $dayData->copticFormatted ?? '',
                'seasonLabel' => $dayData->seasonLabel ?? '',
                'sections' => [],
                'slides' => [],
            ]);
        }

        // Load all sections in order
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
                            'normalized_text' => $l->normalized_text,
                        ])->values(),
                    ])->values(),
                ];
            })
            ->filter(fn ($s) => $s['readings']->isNotEmpty())
            ->values();

        // We build a flat array of 'slides' for the presentation
        $slides = [];
        foreach ($sections as $sectionIndex => $section) {
            foreach ($section['readings'] as $readingIndex => $reading) {
                // Determine has_coptic
                $hasCoptic = $reading['has_coptic'];
                if (!$hasCoptic) {
                    // double check from lines
                    foreach ($reading['lines'] as $line) {
                        if ($line['lang_type'] === 'coptic_arabized') {
                            $hasCoptic = true;
                            break;
                        }
                    }
                }
                
                $slides[] = [
                    'id' => "slide-{$section['code']}-{$reading['id']}",
                    'section_code' => $section['code'],
                    'section_name' => $section['name_ar'],
                    'title' => $reading['title_ar'],
                    'lines' => $reading['lines'],
                    'has_coptic' => $hasCoptic,
                ];
            }
        }

        $dayData = $this->resolver->resolveForDate(
            Carbon::createFromFormat('Y-m-d', $readingDay->date_key) ?? Carbon::today()
        );

        return Inertia::render('PresentationPage', [
            'dayKey' => $dayKey,
            'copticDate' => $dayData->copticFormatted,
            'seasonLabel' => $dayData->seasonLabel,
            'sections' => $sections, // For sidebar navigation
            'slides' => $slides,     // Flat array for sequential next/prev
        ]);
    }
}
