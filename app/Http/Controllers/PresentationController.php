<?php

namespace App\Http\Controllers;

use App\Services\ContentService;
use App\Services\PresentationSearchService;
use App\Support\ReadingLineAssembler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PresentationController extends Controller
{
    public function lectionary(Request $request, string $dayKey, ContentService $content)
    {
        $dayData = null;
        try {
            $season = $request->query('season');
            $dayData = $content->getLectionary($dayKey, $season);
        } catch (\Exception $e) {
            // return redirect()->route('home');
        }

        if (! $dayData) {
            return Inertia::render('PresentationPage', [
                'dayKey' => $dayKey,
                'copticDate' => '',
                'seasonLabel' => '',
                'sections' => [],
                'slides' => [],
                'defaultBaseFontSize' => (int) config('presentation.default_base_font_size', 28),
            ]);
        }

        $sectionsRaw = $dayData;
        $copticDate = $sectionsRaw['Day'] ?? '';
        unset($sectionsRaw['Day']);
        unset($sectionsRaw['style']);

        // ✅ Transform sections - supporting both old (plain string array) and new (object array) formats
        $sections = collect($sectionsRaw)
            ->map(function ($items, $key) {
                if (! is_array($items)) {
                    return null;
                }

                // Normalize items to [{title_ar, text_ar, intonation, conclusion, ...}] format
                $readings = $this->normalizeLectionaryItems($items, $key);

                if (empty($readings)) {
                    return null;
                }

                $sectionName = $readings[0]['title_ar'] ?? $key;

                return [
                    'id' => $key,
                    'code' => $key,
                    'name_ar' => $sectionName,
                    'readings' => collect($readings)
                        ->map(function ($reading, $index) use ($sectionName) {
                            $lines = \App\Support\ReadingLineAssembler::buildLines($reading);
                            $hasCoptic = \App\Support\ReadingLineAssembler::readingHasCoptic($lines);

                            return [
                                'id' => $index + 1,
                                'title_ar' => $reading['title_ar'] ?? $sectionName,
                                'intonation' => $reading['intonation'] ?? null,
                                'conclusion' => $reading['conclusion'] ?? null,
                                'has_coptic' => $hasCoptic,
                                'lines' => $lines,
                                'style' => 1,
                            ];
                        })
                        ->filter(fn ($r) => ! empty($r['lines']))
                        ->values(),
                ];
            })
            ->filter(fn ($s) => $s !== null && $s['readings']->isNotEmpty())
            ->values();


        // ✅ Build slides using title_ar
        $slides = [];
        foreach ($sections as $section) {
            foreach ($section['readings'] as $reading) {
                // Ensure we have valid data
                if (empty($reading['lines'])) {
                    continue;
                }

                $hasCoptic = ReadingLineAssembler::readingHasCoptic($reading['lines']);

                $slides[] = [
                    'id' => "slide-{$section['code']}-{$reading['id']}",
                    'day_key' => $dayKey,
                    'section_code' => $section['code'],
                    'section_name' => $section['name_ar'],
                    'title' => $reading['title_ar'],
                    'intonation' => $reading['intonation'], // ✅ بدون قيمة افتراضية
                    'conclusion' => $reading['conclusion'], // ✅ بدون قيمة افتراضية
                    'lines' => $reading['lines'],
                    'has_coptic' => $hasCoptic,
                ];
            }
        }
        // If no slides, show empty state
        if (empty($slides)) {
            return Inertia::render('PresentationPage', [
                'dayKey' => $dayKey,
                'copticDate' => $copticDate,
                'seasonLabel' => '',
                'sections' => [],
                'slides' => [],
                'defaultBaseFontSize' => (int) config('presentation.default_base_font_size', 28),
            ]);
        }

        return Inertia::render('PresentationPage', [
            'dayKey' => $dayKey,
            'copticDate' => $copticDate,
            'seasonLabel' => $dayData['seasonLabel'] ?? $this->extractSeasonFromDate($copticDate),
            'sections' => $sections,
            'slides' => $slides,
            'defaultBaseFontSize' => (int) config('presentation.default_base_font_size', 28),
        ]);
    }

    public function liturgy(Request $request, ContentService $content)
    {

        //$dayKey = (int) $request->input('dayKey.dayKey');
        //$dayName = $request->input('dayName.dayName');
        //$season = $request->input('season.season');
        $season = $request->input('season', $request->input('season.season', 'annual'));

        $dayKey = (int) ($request->input('dayKey') ?? $request->input('dayKey.dayKey') ?? 0);
        $dayName = $request->input('dayName') ?? $request->input('dayName.dayName') ?? '';

        $churchSettingsRaw = $request->cookie('church_settings');
        $churchSettings = [];
        if ($churchSettingsRaw) {
            $churchSettings = json_decode($churchSettingsRaw, true) ?? [];
        }

        $popename = $churchSettings['popename'] ?? 'تواضروس الثاني';
        $patron = $churchSettings['patron'] ?? 'العذراء مريم';
        $diocesan_bishop = $churchSettings['diocesan_bishop'] ?? null;
        $visiting_bishops = $churchSettings['visiting_bishops'] ?? [];
        try {
            if($diocesan_bishop['DefNoun'] === 'ان'){
                $diocesan_bishop['DefNoun'] = 'ان ';
            }
        } catch (\Exception $e) {
            $diocesan_bishop = null;
        }

        $data = [
            'dayKey' => $dayKey,
            'dayName' => $dayName,
            'season' => $season,
            'popename' => $popename,
            'patron' => $patron,
            'diocesan_bishop' => $diocesan_bishop,
            'visiting_bishops' => $visiting_bishops,
            // Fallbacks for compatibility if ContentService relies on old keys
            'bishoprole' => $diocesan_bishop['role'] ?? 'أسقف',
            'bishopCoRole' => $diocesan_bishop['coRole'] ?? 'أبيسكوبوس',
            'DefNoun' => $diocesan_bishop['DefNoun'] ?? 'ان',
            'bishopname' => $diocesan_bishop['name'] ?? '',
        ];

        try {
            $Data = $content->getLiturgy($data);
        } catch (\Exception $e) {
            return redirect()->route('home');
        }

        if (! $Data) {
            $lectionaryData = $content->getLectionary($dayKey, $season);
            if ($lectionaryData) {
                return $this->lectionary($request, (string)$dayKey, $content);
            }

            return Inertia::render('PresentationPage', [
                'dayKey' => $dayKey,
                'copticDate' => '',
                'sections' => [],
                'slides' => [],
                'defaultBaseFontSize' => (int) config('presentation.default_base_font_size', 28),
            ]);
        }

        // ✅ تحويل البيانات مع دمج المتحدثين في كل قسم
        $sections = collect($Data)->map(function ($sectionData, $key) {

            // If the section has alternatives
            if (($sectionData['has_alternatives'] ?? false) === true) {
                return [
                    'id'               => $key,
                    'code'             => $key,
                    'name_ar'          => $sectionData['title'],
                    'has_alternatives' => true,
                    'active_index'     => 0,
                    'alternatives'     => collect($sectionData['alternatives'])->map(function ($alt) {
                        $allLines = [];
                        foreach ($alt['content'] as $readingPart) {
                            $partLines = ReadingLineAssembler::buildLines($readingPart);
                            $allLines  = array_merge($allLines, $partLines);
                        }
                        return [
                            'label'     => $alt['label'],
                            'title'     => $alt['title'],
                            'style'     => $alt['style'],
                            'has_coptic'=> ReadingLineAssembler::readingHasCoptic($allLines),
                            'lines'     => $allLines,
                        ];
                    })->values()->toArray(),
                ];
            }
            // Normal behavior (has_alternatives === false)
            $items = $sectionData['content'] ?? [];
            $sectionTitle = $sectionData['title'];
            $intonation = $sectionData['intonation']?? null;
            $conclusion = $sectionData['conclusion']?? null;

            $allLinesInOneReading = [];
            foreach ($items as $readingPart) {
                $partLines = ReadingLineAssembler::buildLines($readingPart);
                $allLinesInOneReading = array_merge($allLinesInOneReading, $partLines);
            }

            $hasCoptic = ReadingLineAssembler::readingHasCoptic($allLinesInOneReading);

            return [
                'id' => $key,
                'code' => $key,
                'name_ar' => $sectionTitle,
                'has_alternatives' => false,
                'readings' => [
                    [
                        'id' => 1,
                        'title_ar' => $sectionTitle,
                        'intonation' => $intonation,
                        'conclusion' => $conclusion,
                        'has_coptic' => $hasCoptic,
                        'lines' => $allLinesInOneReading,
                        'style' => 1,
                    ],
                ],
            ];
        })->values();

        //dd($sections);
        // ✅ Build slides
        $slides = [];
        foreach ($sections as $section) {
            if ($section['has_alternatives'] === true) {
                // Only add this slide if at least the first alternative has non-empty lines
                if (empty($section['alternatives'][0]['lines'])) {
                    continue;
                }

                $slides[] = [
                    'id'               => "slide-{$section['code']}",
                    'section_code'     => $section['code'],
                    'section_name'     => $section['name_ar'],
                    'has_alternatives' => true,
                    'active_index'     => 0,
                    'alternatives'     => array_map(function ($alt) {
                        return [
                            'label'     => $alt['label'],
                            'title'     => $alt['title'],
                            'lines'     => $alt['lines'],
                            'has_coptic'=> $alt['has_coptic'],
                        ];
                    }, $section['alternatives']),
                ];
                continue;
            }

            // Normal section slides
            $reading = $section['readings'][0];

            if (empty($reading['lines'])) {
                continue;
            }

            $slides[] = [
                'id' => "slide-{$section['code']}",
                'day_key' => $dayKey,
                'section_code' => $section['code'],
                'section_name' => $section['name_ar'],
                'title' => $reading['title_ar'],
                'intonation' => $reading['intonation']?? null,
                'conclusion' => $reading['conclusion']?? null,
                'lines' => $reading['lines'],
                'has_coptic' => $reading['has_coptic'],
            ];
        }
        //dd($slides);
        if (empty($slides)) {
            $lectionaryData = $content->getLectionary($dayKey, $season);
            if ($lectionaryData) {
                return $this->lectionary($request, (string)$dayKey, $content);
            }
        }

        return Inertia::render('PresentationPage', [
            'dayKey' => $dayKey,
            'sections' => $sections,
            'slides' => $slides,
            'defaultBaseFontSize' => (int) config('presentation.default_base_font_size', 28),
        ]);
    }

    public function mirror()
    {
        return Inertia::render('MirrorComponent');
    }
    public function croma_mirror()
    {
        return Inertia::render('ChromaMirror');
    }

    public function search(Request $request, PresentationSearchService $presentationSearchService): JsonResponse
    {
        $q = $request->query('q', '');
        if (! is_string($q)) {
            return response()->json(['results' => []]);
        }

        $q = trim($q);
        if (mb_strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $type = $request->query('type', 'liturgy');
        Log::info('🔍 Presentation Search Request', [
            'q' => $q,
            'type_from_query' => $request->query('type'),
            'type_final' => $type,
            'all_query_params' => $request->query(), // جميع الـ parameters
            'full_url' => $request->fullUrl(), // الرابط الكامل
            'headers' => $request->headers->all(), // جميع الـ headers
        ]);
        if (! in_array($type, ['liturgy', 'lectionary', 'synaxarium','all'], true)) {
            $type = 'all';
        }

        return response()->json([
            'results' => $presentationSearchService->search($q, $type),
        ]);
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

    /**
     * Normalize lectionary section items to a unified format:
     * [['title_ar' => ..., 'text_ar' => [...], 'intonation' => ..., 'conclusion' => ...], ...]
     *
     * Supports:
     *   - Old format: ["Section Title", "line1", "line2", ...]
     *   - New format: [{"title_ar": ..., "text_ar": [...], ...}, ...]
     */
    private function normalizeLectionaryItems(array $items, string $fallbackKey): array
    {
        if (empty($items)) {
            return [];
        }

        $firstItem = $items[0] ?? null;

        // Old format: first element is a string (title), rest are text lines
        if (is_string($firstItem)) {
            $title = $firstItem;
            $body = array_slice($items, 1);
            // Filter out any non-string values
            $body = array_values(array_filter($body, fn($v) => is_string($v) || is_numeric($v)));

            return [
                [
                    'title_ar'   => $title,
                    'intonation' => null,
                    'conclusion' => null,
                    'text_ar'    => $body,
                    'text_co'    => [],
                    'text_ar_co' => [],
                ],
            ];
        }

        // New format: each element is an associative array with text_ar
        $out = [];
        foreach ($items as $item) {
            if (is_array($item) && isset($item['text_ar'])) {
                $out[] = $item;
            }
        }

        return $out;
    }
}
