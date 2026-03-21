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
    public function getLiturgy(string|int $day): ?array
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT) . '.json';

        // قائمة الملفات بالترتيب الذي تريده
        // المفتاح هو اسم المجلد، والقيمة هي التسمية التي ستظهر في الكود النهائي
        $fileConfigs = [
            'ellison emas',
            'ellison emas - Copy',

        ];

        $combinedData = [];
        $counter = 1;

        foreach ($fileConfigs as $file) {
            $path = base_path("content/liturgy/{$file}.json");

            if (file_exists($path)) {
                $content = json_decode(file_get_contents($path), true);

                if ($content) {
                    // بناء المفتاح الجديد مثل: 1_ellison_emas
                    $newKey = "{$counter}_{$content['code']}";

                    // نضع المحتوى داخل المفتاح المرقم
                    // مع الاحتفاظ بـ title و style و content من الملف الأصلي
                    $combinedData[$newKey] = [
                        "title"   => $content['title'] ?? '',
                        "style"   => $content['style'] ?? 1,
                        "content" => $content['content'] ?? []
                    ];

                    $counter++;
                }
            }
        }
        //dd($combinedData);

        return !empty($combinedData) ? $combinedData : null;
    }

}
