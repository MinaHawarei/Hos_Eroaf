<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class ContentService
{
    public function getByDayIndex(int $day): ?array
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT);
        $path = base_path("content/readings/{$file}.json");
        if (!file_exists($path)) {
            return null;
        }
        return json_decode(file_get_contents($path), true);

    }
}
