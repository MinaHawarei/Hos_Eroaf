<?php

namespace App\Services;

use App\Support\ReadingLineAssembler;
use Illuminate\Support\Facades\File;

class PresentationSearchService
{
    private const LectionaryDir = 'content/lectionary';

    private const LiturgyDir = 'content/liturgy';

    /**
     * @return array<int, array{
     *     source: string,
     *     file: string,
     *     label: string,
     *     slide: array<string, mixed>
     * }>
     */
    public function search(string $query, int $limit = 60): array
    {
        $normalizedQuery = $this->normalizeArabic($query);
        if ($normalizedQuery === '') {
            return [];
        }

        $results = [];
        $base = base_path();

        $lectionaryPath = $base.DIRECTORY_SEPARATOR.self::LectionaryDir;
        if (is_dir($lectionaryPath)) {
            foreach (File::files($lectionaryPath) as $fileInfo) {
                if (strtolower($fileInfo->getExtension()) !== 'json') {
                    continue;
                }
                $this->searchLectionaryFile($fileInfo->getPathname(), $fileInfo->getFilename(), $normalizedQuery, $results, $limit);
                if (count($results) >= $limit) {
                    return $results;
                }
            }
        }

        $liturgyPath = $base.DIRECTORY_SEPARATOR.self::LiturgyDir;
        if (is_dir($liturgyPath)) {
            foreach (File::files($liturgyPath) as $fileInfo) {
                if (strtolower($fileInfo->getExtension()) !== 'json') {
                    continue;
                }
                $this->searchLiturgyFile($fileInfo->getPathname(), $fileInfo->getFilename(), $normalizedQuery, $results, $limit);
                if (count($results) >= $limit) {
                    break;
                }
            }
        }

        return $results;
    }

    /**
     * @param  array<int, array<string, mixed>>  $results
     */
    private function searchLectionaryFile(string $path, string $filename, string $normalizedQuery, array &$results, int $limit): void
    {
        $raw = file_get_contents($path);
        if ($raw === false) {
            return;
        }

        /** @var array<string, mixed>|null $data */
        $data = json_decode($raw, true);
        if (! is_array($data)) {
            return;
        }

        $dayLabel = is_string($data['Day'] ?? null) ? (string) $data['Day'] : $filename;

        foreach ($data as $sectionKey => $items) {
            if (in_array($sectionKey, ['Day', 'style', 'seasonLabel'], true)) {
                continue;
            }
            if (! is_array($items)) {
                continue;
            }

            $readings = $this->normalizeLectionarySectionItems($items);
            $sectionName = $readings[0]['title_ar'] ?? (string) $sectionKey;

            foreach ($readings as $rIndex => $reading) {
                $lines = ReadingLineAssembler::buildLines($reading);
                if ($lines === []) {
                    continue;
                }

                if (! $this->linesMatch($lines, $normalizedQuery)) {
                    continue;
                }

                $hasCoptic = ReadingLineAssembler::readingHasCoptic($lines);
                $slide = [
                    'id' => 'global-lectionary-'.pathinfo($filename, PATHINFO_FILENAME).'-'.$sectionKey.'-'.($rIndex + 1),
                    'section_code' => (string) $sectionKey,
                    'section_name' => $sectionName,
                    'title' => $reading['title_ar'] ?? $sectionName,
                    'intonation' => $reading['intonation'] ?? null,
                    'conclusion' => $reading['conclusion'] ?? null,
                    'lines' => $lines,
                    'has_coptic' => $hasCoptic,
                ];

                $results[] = [
                    'source' => 'lectionary',
                    'file' => $filename,
                    'label' => 'قطمارس — '.$dayLabel.' — '.($slide['title'] ?? $sectionName),
                    'slide' => $slide,
                ];

                if (count($results) >= $limit) {
                    return;
                }
            }
        }
    }

    /**
     * @param  array<int, mixed>  $items
     * @return array<int, array<string, mixed>>
     */
    private function normalizeLectionarySectionItems(array $items): array
    {
        if ($items === []) {
            return [];
        }

        if (isset($items[0]) && is_string($items[0])) {
            $title = (string) $items[0];
            $body = array_slice($items, 1);

            return [
                [
                    'title_ar' => $title,
                    'intonation' => null,
                    'conclusion' => null,
                    'text_ar' => $body,
                    'text_co' => [],
                    'text_ar_co' => [],
                ],
            ];
        }

        $out = [];
        foreach ($items as $item) {
            if (is_array($item) && isset($item['text_ar'])) {
                $out[] = $item;
            }
        }

        return $out;
    }

    /**
     * @param  array<int, array<string, mixed>>  $results
     */
    private function searchLiturgyFile(string $path, string $filename, string $normalizedQuery, array &$results, int $limit): void
    {
        $raw = file_get_contents($path);
        if ($raw === false) {
            return;
        }

        /** @var array<string, mixed>|null $fileContent */
        $fileContent = json_decode($raw, true);
        if (! is_array($fileContent)) {
            return;
        }

        $title = is_string($fileContent['title'] ?? null) ? (string) $fileContent['title'] : $filename;
        $slug = is_string($fileContent['code'] ?? null) ? (string) $fileContent['code'] : pathinfo($filename, PATHINFO_FILENAME);
        $content = $fileContent['content'] ?? [];

        if (! is_array($content)) {
            return;
        }

        foreach ($content as $idx => $part) {
            if (! is_array($part)) {
                continue;
            }

            $lines = ReadingLineAssembler::buildLines($part);
            if ($lines === [] || ! $this->linesMatch($lines, $normalizedQuery)) {
                continue;
            }

            $hasCoptic = ReadingLineAssembler::readingHasCoptic($lines);
            $slide = [
                'id' => 'global-liturgy-'.$slug.'-part-'.($idx + 1),
                'section_code' => $slug,
                'section_name' => $title,
                'title' => $title,
                'intonation' => null,
                'conclusion' => null,
                'lines' => $lines,
                'has_coptic' => $hasCoptic,
            ];

            $results[] = [
                'source' => 'liturgy',
                'file' => $filename,
                'label' => 'قداس — '.$title,
                'slide' => $slide,
            ];

            if (count($results) >= $limit) {
                return;
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function linesMatch(array $lines, string $normalizedQuery): bool
    {
        foreach ($lines as $line) {
            $text = $line['text'] ?? '';
            if (! is_string($text) || $text === '') {
                continue;
            }
            if (str_contains($this->normalizeArabic($text), $normalizedQuery)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeArabic(string $str): string
    {
        $str = preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $str) ?? '';
        $str = str_replace(['أ', 'إ', 'آ'], 'ا', $str);
        $str = str_replace('ة', 'ه', $str);
        $str = str_replace('ى', 'ي', $str);

        return mb_strtolower($str, 'UTF-8');
    }
}
