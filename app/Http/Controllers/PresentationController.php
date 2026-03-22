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


    public function lectionary(Request $request, string $dayKey , ContentService $content)
    {
        try {
            $dayData = $content->getLectionary($dayKey);
        } catch (\Exception $e) {
            //return redirect()->route('home');
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
                $sectionName = $firstReading['title_ar'] ;

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
    public function liturgy(Request $request, ContentService $content)
    {

        $dayKey  = (int)$request->input('dayKey.dayKey');
        $dayName = $request->input('dayName.dayName');
        $season  = $request->input('season.season');

        $churchSettingsRaw = $request->cookie('church_settings');
        $churchSettings = [];
        if ($churchSettingsRaw) {
            $churchSettings = json_decode($churchSettingsRaw, true) ?? [];
        }

        $popename = $churchSettings['popename'] ?? 'تواضروس الثاني';
        $patron = $churchSettings['patron'] ?? 'العذراء مريم';
        $diocesan_bishop = $churchSettings['diocesan_bishop'] ?? null;
        $visiting_bishops = $churchSettings['visiting_bishops'] ?? [];

        $data = [
            "dayKey" => $dayKey ,
            "dayName"=> $dayName,
            "season" => $season,
            "popename" => $popename,
            "patron" => $patron,
            "diocesan_bishop" => $diocesan_bishop,
            "visiting_bishops" => $visiting_bishops,
            // Fallbacks for compatibility if ContentService relies on old keys
            "bishoprole" => $diocesan_bishop['role'] ?? 'أسقف',
            "bishopCoRole" => $diocesan_bishop['coRole'] ?? 'أبيسكوبوس',
            "bishopname" => $diocesan_bishop['name'] ?? ''
        ];

        try {
            $Data = $content->getLiturgy($data);
        } catch (\Exception $e) {
            return redirect()->route('home');
        }

        if (!$Data) {
            return Inertia::render('PresentationPage', [
                'dayKey' => $dayKey,
                'copticDate' => '',
                'sections' => [],
                'slides' => [],
            ]);
        }

        // ✅ تحويل البيانات مع دمج المتحدثين في كل قسم
        $sections = collect($Data)->map(function ($sectionData, $key) {
            $items = $sectionData['content'] ?? [];
            $sectionTitle = $sectionData['title'] ;

            // --- التعديل الجوهري هنا: دمج كل الأسطر من جميع المتحدثين في مصفوفة واحدة ---
            $allLinesInOneReading = [];
            foreach ($items as $readingPart) {
                // نستخدم دالتك buildLines لجلب أسطر هذا المتحدث
                $partLines = $this->buildLines($readingPart);
                // ندمجها مع المصفوفة الكبيرة للقسم
                $allLinesInOneReading = array_merge($allLinesInOneReading, $partLines);
            }

            $hasCoptic = collect($allLinesInOneReading)->contains('lang_type', 'coptic_arabized');

            return [
                'id' => $key,
                'code' => $key,
                'name_ar' => $sectionTitle,
                'readings' => [
                    [
                        'id' => 1, // دائماً واحد لأننا دمجناهم
                        'title_ar' => $sectionTitle,
                        'intonation_ar' => null,
                        'has_coptic' => $hasCoptic,
                        'lines' => $allLinesInOneReading, // الأسطر المدمجة
                        'style' => 1,
                    ]
                ],
            ];
        })->values();

        // ✅ بناء السلايدات (كل قسم سيصبح Slide واحدة الآن)
        $slides = [];
        foreach ($sections as $section) {
            // بما أن كل قسم لديه مصفوفة readings فيها عنصر واحد فقط الآن
            $reading = $section['readings'][0];

            if (empty($reading['lines'])) continue;

            $slides[] = [
                'id' => "slide-{$section['code']}",
                'section_code' => $section['code'],
                'section_name' => $section['name_ar'],
                'title' => $reading['title_ar'],
                'intonation_ar' => null,
                'lines' => $reading['lines'],
                'has_coptic' => $reading['has_coptic'],
            ];
        }

        return Inertia::render('PresentationPage', [
            'dayKey' => $dayKey,
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
        // جلب القائل (الكاهن، الشعب، إلخ)
        $speaker = $reading['speaker'] ?? null;

        $textAr = $reading['text_ar'] ?? [];
        $textCo = $reading['text_co'] ?? [];
        $textArCo = $reading['text_ar_co'] ?? [];

        $maxLines = max(count($textAr), count($textCo), count($textArCo));

        for ($i = 0; $i < $maxLines; $i++) {
            $arText = $textAr[$i] ?? '';
            $coText = $textCo[$i] ?? '';
            $arCoText = $textArCo[$i] ?? '';

            // نرسل الـ speaker مع أول سطر فقط في المجموعة أو مع كل الأسطر حسب تفضيلك
            // هنا سأرسله مع كل سطر ليتمكن الـ Frontend من معرفة صاحب النص

            if (!empty($arText)) {
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'arabic',
                    'text' => $arText,
                    'speaker' => $speaker // إدراج القائل هنا
                ];
            }

            if (!empty($arCoText)) {
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'coptic_arabized',
                    'text' => $arCoText,
                    'speaker' => $speaker
                ];
            }

            if (!empty($coText)) {
                $lines[] = [
                    'id' => $lineOrder++,
                    'lang_type' => 'coptic',
                    'text' => $coText,
                    'speaker' => $speaker
                ];
            }
        }

        return $lines;
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
