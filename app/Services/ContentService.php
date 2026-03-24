<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class ContentService
{
    public function getByDayIndex(int $day): ?array
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT);
        $path = base_path("content/lectionary/{$file}.json");
        if (!file_exists($path)) {
            return null;
        }
        return json_decode(file_get_contents($path), true);

    }
    public function getLectionary(string|int $day): ?array
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT);
        $path = base_path("content/lectionary/{$file}.json");
        if (!file_exists($path)) {
            return null;
        }
        return json_decode(file_get_contents($path), true);
    }

    /**
     * دالة دمج ملفات القداس بتنسيق مرقم
     */
    public function getLiturgy($data): ?array
    {
        $day = $data['dayKey'];
        $dayName = $data['dayName'];
        $season = $data['season'];


        $file = str_pad($day, 3, '0', STR_PAD_LEFT) . '.json';
        $FastingDays = ['الأربعاء', 'الجمعة'];
        $FastingSeasons = ['apostles_fast', 'nativity_fast', 'jonah_fast', 'great_lent'];
        // قائمة الملفات بالترتيب الذي تريده
        $fileConfigs = [
            "ellison_emas" =>'ellison emas',
            "our_father" => [
                ['file' => 'ابانا الذي في السموات', 'label' => 'النسخة الأولى'],
                ['file' => 'ابانا النسخة الثانية',  'label' => 'النسخة الثانية'],
                ['file' => 'ابانا النسخة الثانية',  'label' => 'النسخة الثالثة'],
                ['file' => 'ابانا النسخة الثانية',  'label' => 'النسخة الرابعة'],
            ],
            "aliloia_fay_be" =>[

                ['file' => 'الليلويا فاي بي', 'label' => 'النسخة الأولى'],
                ['file' => 'الليلويا جي افمفئي',  'label' => 'النسخة الثانية'],

            ],
            "oshit_alabaa" =>'اوشية الاباء',
        ];


        $isGreatLentSunday = ($season === 'great_lent' && $dayName === 'الأحد');

        $isRegularFastingDay = in_array($season, $FastingSeasons)
                            && in_array($dayName, $FastingDays)
                            && $season !== 'pentecost';

        if ($isGreatLentSunday || $isRegularFastingDay) {
            $fileConfigs["aliloia_fay_be"] = 'الليلويا جي افمفئي';

        }else if( in_array($season , $FastingSeasons)){
            //$fileConfigs["aliloia_fay_be"] = 'الليلويا إي إ';
        }

        $variables = $data;
        unset($variables['dayKey'], $variables['dayName'], $variables['season']);

        $combinedData = [];
        $counter = 1;

        foreach ($fileConfigs as $configKey => $entry) {
            if (is_array($entry)) {
                // ✅ Case: Alternatives
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
                            $processedContent = $this->replaceVariables($fileContent['content'] ?? [], $variables);
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

            } else {
                // ✅ Case: Single file string
                $fileName = $entry;
                $path = base_path("content/liturgy/{$fileName}.json");

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
                if (is_scalar($value)) { // ✅ مهم
                    $content = str_replace('$' . $key, $value, $content);
                }
            }
        }

        return $content;
    }
}
