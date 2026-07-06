<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ContentService
{
    public function getByDayIndex(int $day): ?array
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT);
        $path = base_path("storage/content/lectionary/{$file}.json");
        if (!file_exists($path)) {
            return null;
        }
        $data = json_decode(file_get_contents($path), true);
        if ($data && isset($data['synaxarium'])) {
            unset($data['synaxarium']);
        }
        return $data;
    }

    public function getLectionary(string|int $day, ?string $season = null): ?array
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT);
        $data = null;

        if ($season === 'holy_week') {
            $holyWeekFile = base_path("storage/content/lectionary/holy_week.json");
            $holyWeekDirFile = base_path("storage/content/lectionary/holy_week/{$file}.json");

            if (file_exists($holyWeekFile)) {
                $allHolyWeek = json_decode(file_get_contents($holyWeekFile), true);
                if (isset($allHolyWeek[$day])) {
                    $data = $allHolyWeek[$day];
                } elseif (isset($allHolyWeek[$file])) {
                    $data = $allHolyWeek[$file];
                }
            } elseif (file_exists($holyWeekDirFile)) {
                $data = json_decode(file_get_contents($holyWeekDirFile), true);
            }
        }

        if (!$data) {
            $path = base_path("storage/content/lectionary/{$file}.json");
            if (file_exists($path)) {
                $data = json_decode(file_get_contents($path), true);
            }
        }

        if (!$data) {
            // Check if Synaxarium exists as a fallback
            $synaxariumPath = base_path("storage/content/lectionary/synaxarium/{$file}.json");
            if (file_exists($synaxariumPath)) {
                $data = [
                    'Day' => '',
                    'style' => 1
                ];
            }
        }

        if (!$data) {
            return null;
        }

        // Preserve backward compatibility by clearing any existing old-format/new-format synaxarium key
        if (isset($data['synaxarium'])) {
            unset($data['synaxarium']);
        }

        // ✅ معالجة السنكسار بناءً على الموسم
        if ($season !== 'pentecost' && $season !== 'holy_week') {
            $synaxariumPath = base_path("storage/content/lectionary/synaxarium/{$file}.json");
            if (file_exists($synaxariumPath)) {
                $synaxariumData = json_decode(file_get_contents($synaxariumPath), true);
                if ($synaxariumData) {
                    $textContent = $synaxariumData['content'] ?? '';
                    $textAr = array_values(array_filter(array_map('trim', explode("\n", $textContent))));
                    $copticDateService = app(CopticDateService::class);
                    $copticDate = $synaxariumData['coptic_date'] ?? '';
                    $formattedDate = $copticDateService->formatSearchLabel($copticDate, 'verbal');

                    $data['synaxarium'] = [
                        [
                            'title_ar' => 'السنكسار',
                            'intonation' => $formattedDate,
                            'conclusion' => null,
                            'text_ar' => $textAr,
                            'text_co' => [],
                            'text_ar_co' => []
                        ]
                    ];
                }
            }
        }

        return $data;
    }

    private function getLectionarySections($day, $requiredSections = [], $variables = [])
    {
        $season = $variables['season'] ?? null;
        $data = $this->getLectionary($day, $season);

        if (!$data) return [];

        $result = [];

        foreach ($requiredSections as $sectionKey) {

            if (!isset($data[$sectionKey])) continue;

            foreach ($data[$sectionKey] as $item) {

                $content = [
                    [
                        "speaker" => "", // أو "القارئ"
                        "text_ar" => $item['text_ar'] ?? [],
                        "text_ar_co" => $item['text_ar_co'] ?? [],
                        "text_co" => $item['text_co'] ?? [],
                    ]
                ];

                $result[] = [
                    "title" => $item['title_ar'] ?? $sectionKey,
                    "style" => $data['style'] ?? 1,
                    "has_alternatives" => false,

                    // 👇 الجديد
                    "intonation" => $item['intonation'] ?? null,
                    "conclusion" => $item['conclusion'] ?? null,

                    "content" => $content
                ];
            }
        }

        return $result;
    }


    public function getLiturgy($data): ?array
    {
        $day = $data['dayKey'];
        $dayName = $data['dayName'];
        $season = $data['season'];

        // Get config from LiturgyConfigService
        $fileConfigs = app(LiturgyConfigService::class)->getConfig($season, $dayName);

        $variables = $data;
        unset($variables['dayKey'], $variables['dayName'], $variables['season']);

        $combinedData = [];
        $counter = 1;

        foreach ($fileConfigs as $configKey => $entry) {

            // =============================
            // ✅ CASE 1: Lectionary
            // =============================
            if (is_array($entry) && ($entry['type'] ?? null) === 'lectionary') {

                $sections = $this->getLectionarySections($day, [$configKey], $variables);

                foreach ($sections as $section) {
                    $newKey = "{$counter}_{$configKey}";
                    $combinedData[$newKey] = $section;
                    $counter++;
                }

                continue;
            }

            // =============================
            // ✅ CASE 2: Alternatives
            // =============================
            if (is_array($entry)) {

                $alternativesArr = [];
                $mainTitle = '';
                $mainStyle = 1;

                foreach ($entry as $altConfig) {
                    $fileName = $altConfig['file'];
                    $label = $altConfig['label'];
                    $path = base_path("storage/content/liturgy/{$fileName}.json");

                    if (file_exists($path)) {
                        $fileContent = json_decode(file_get_contents($path), true);

                        if ($fileContent) {
                            $processedContent = $this->replaceVariables(
                                $fileContent['content'] ?? [],
                                $variables
                            );

                            $altData = [
                                "label"   => $label,
                                "title"   => $fileContent['title'] ?? '',
                                "style"   => $fileContent['style'] ?? 1,
                                "content" => $processedContent ?? []
                            ];

                            $alternativesArr[] = $altData;

                            if (empty($mainTitle)) {
                                $mainTitle = $altData['title'];
                                $mainStyle = $altData['style'];
                            }
                        }
                    }
                }

                if (!empty($alternativesArr)) {
                    $newKey = "{$counter}_{$configKey}";
                    $combinedData[$newKey] = [
                        "title"            => $mainTitle,
                        "style"            => $mainStyle,
                        "has_alternatives" => true,
                        "active_index"     => 0,
                        "alternatives"     => $alternativesArr
                    ];
                    $counter++;
                }

                continue;
            }

            // =============================
            // ✅ CASE 3: Single file
            // =============================
            $fileName = $entry;
            $path = base_path("storage/content/liturgy/{$fileName}.json");

            if (file_exists($path)) {
                $fileContent = json_decode(file_get_contents($path), true);

                if ($fileContent) {
                    $processedContent = $this->replaceVariables(
                        $fileContent['content'] ?? [],
                        $variables
                    );

                    $slug = $fileContent['code'] ?? $configKey;
                    $newKey = "{$counter}_{$slug}";

                    $combinedData[$newKey] = [
                        "title"            => $fileContent['title'] ?? '',
                        "style"            => $fileContent['style'] ?? 1,
                        "has_alternatives" => false,
                        "content"          => $processedContent ?? []
                    ];

                    $counter++;
                }
            }
        }

        return !empty($combinedData) ? $combinedData : null;
    }

    private function replaceVariables($content, $variables)
    {
        if (is_array($content)) {
            return array_map(function ($item) use ($variables) {
                return $this->replaceVariables($item, $variables);
            }, $content);
        }

        if (is_string($content)) {
            foreach ($variables as $key => $value) {
                if (is_scalar($value)) {
                    $content = str_replace('$' . $key, $value, $content);
                }
            }
        }

        return $content;
    }
}
