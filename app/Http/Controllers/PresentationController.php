<?php

namespace App\Http\Controllers;

use App\Models\ReadingDay;
use App\Models\ReadingSection;
use App\Services\ReadingResolverService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\ContentService;

class PresentationController extends Controller
{
    public function __construct(
        private readonly ContentService $content,
    ) {}

    public function show(Request $request, string $dayKey)
    {
        try {
            $dayData = $this->content->getByDayIndex($dayKey);
        } catch (\Exception $e) {
            return redirect()->route('home');
        }

        if (!$dayData) {
            return Inertia::render('PresentationPage', [
                'dayKey' => $dayKey,
                'copticDate' => '',
                'seasonLabel' => '',
                'sections' => [],
                'slides' => [],
            ]);
        }

        $sectionsRaw = $dayData;
        $copticDate = $sectionsRaw['Day'] ?? '';
        unset($sectionsRaw['Day']);
        unset($sectionsRaw['style']);

        // ✅ Transform sections - using title_ar from JSON
        $sections = collect($sectionsRaw)
            ->map(function ($items, $key) {
                // Each section has an array of readings (usually one item)
                $firstReading = $items[0] ?? null;

                // Get section name from title_ar or use fallback
                $sectionName = $firstReading['title_ar'] ?? $this->getDefaultSectionName($key);

                return [
                    'id' => $key,
                    'code' => $key,
                    'name_ar' => $sectionName,
                    'readings' => collect($items)->map(function ($reading, $index) use ($sectionName) {
                        // Build lines first to determine if has_coptic
                        $lines = $this->buildLines($reading);
                        $hasCoptic = collect($lines)->contains('lang_type', 'coptic_arabized');

                        return [
                            'id' => $index + 1,
                            'title_ar' => $reading['title_ar'] ?? $sectionName,
                            'intonation_ar' => $reading['intonation_ar'] ?? null,
                            'intonation_co' => $reading['intonation_co'] ?? null,
                            'has_coptic' => $hasCoptic,
                            'lines' => $lines,
                            'style' => 1,
                        ];
                    })->values(),
                ];
            })
            ->filter(fn ($s) => $s['readings']->isNotEmpty())
            ->values();

        // ✅ Build slides using title_ar
        $slides = [];
        foreach ($sections as $section) {
            foreach ($section['readings'] as $reading) {
                // Ensure we have valid data
                if (empty($reading['lines'])) {
                    continue;
                }

                $hasCoptic = collect($reading['lines'])->contains('lang_type', 'coptic_arabized');

                $slides[] = [
                    'id' => "slide-{$section['code']}-{$reading['id']}",
                    'section_code' => $section['code'],
                    'section_name' => $section['name_ar'],
                    'title' => $reading['title_ar'],
                    'intonation_ar' => $reading['intonation_ar'], // ✅ بدون قيمة افتراضية
                    'intonation_co' => $reading['intonation_co'], // ✅ بدون قيمة افتراضية
                    'lines' => $reading['lines'],
                    'has_coptic' => $hasCoptic,
                ];
            }
        }
        //dd($slides);
        // If no slides, show empty state
        if (empty($slides)) {
            return Inertia::render('PresentationPage', [
                'dayKey' => $dayKey,
                'copticDate' => $copticDate,
                'seasonLabel' => '',
                'sections' => [],
                'slides' => [],
            ]);
        }

        return Inertia::render('PresentationPage', [
            'dayKey' => $dayKey,
            'copticDate' => $copticDate,
            'seasonLabel' => $dayData['seasonLabel'] ?? $this->extractSeasonFromDate($copticDate),
            'sections' => $sections,
            'slides' => $slides,
        ]);
    }

    /**
     * Build lines array from Arabic and Coptic text
     */
    private function buildLines(array $reading): array
    {
        $lines = [];
        $lineOrder = 0;

        $textAr = $reading['text_ar'] ?? [];
        $textCo = $reading['text_co'] ?? [];
        $textArCo = $reading['text_ar_co'] ?? [];

        // Determine the maximum number of lines
        $maxLines = max(count($textAr), count($textCo));

        // Create lines in the format expected by SplitViewReader
        for ($i = 0; $i < $maxLines; $i++) {
            $arText = $textAr[$i] ?? '';
            $coText = $textCo[$i] ?? '';
            $arCoText = $textArCo[$i] ?? '';

            // If both exist, create two lines
            if (!empty($arText) && !empty($arCoText)) {
                // Arabic line
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'arabic',
                    'text' => $arText,
                ];

                // Coptic line
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'coptic',
                    'text' => $coText,
                ];
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'coptic_arabized',
                    'text' => $arCoText,
                ];
            }
            // If only Arabic exists
            elseif (!empty($arText)) {
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'arabic',
                    'text' => $arText,
                ];
            }
            // If only Coptic exists
            elseif (!empty($arCoText)) {
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'coptic_arabized',
                    'text' => $arCoText,
                ];
            }
        }

        return $lines;
    }

    /**
     * Fallback section names in case title_ar is missing
     */
    private function getDefaultSectionName(string $key): string
    {
        return [
            'vespers_psalm' => 'مزمور عشية',
            'vespers_gospel' => 'إنجيل عشية',
            'matins_psalm' => 'مزمور باكر',
            'matins_gospel' => 'إنجيل باكر',
            'pauline' => 'البولس',
            'catholic' => 'الكاثوليكون',
            'praxis' => 'الإبركسيس',
            'synaxarium' => 'السنكسار',
            'liturgy_psalm' => 'مزمور القداس',
            'liturgy_gospel' => 'إنجيل القداس',
        ][$key] ?? $key;
    }

    /**
     * Extract season from Coptic date (you can enhance this)
     */
    private function extractSeasonFromDate(string $copticDate): string
    {
        // Simple extraction - you can make this more sophisticated
        if (str_contains($copticDate, 'توت') || str_contains($copticDate, 'بابه') ||
            str_contains($copticDate, 'هاتور') || str_contains($copticDate, 'كيهك')) {
            return 'القطمارس';
        }

        return '';
    }
}
