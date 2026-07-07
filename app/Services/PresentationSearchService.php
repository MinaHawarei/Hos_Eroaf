<?php

namespace App\Services;

use App\Support\ReadingLineAssembler;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class PresentationSearchService
{
    private const LectionaryDir = 'storage/content/lectionary';
    private const LiturgyDir = 'storage/content/liturgy';
    private const SynaxariumDir = 'storage/content/lectionary/synaxarium';

    /**
     * @var CopticDateService
     */
    private CopticDateService $copticDateService;

    /**
     * Constructor
     */
    public function __construct(CopticDateService $copticDateService)
    {
        $this->copticDateService = $copticDateService;
    }

    /**
     * Search for content across different liturgical sources
     *
     * @param string $query The search query
     * @param string $type Search scope: 'all', 'liturgy', 'lectionary', or 'synaxarium'
     * @param int $limit Maximum number of results to return
     * @return array<int, array{
     *     source: string,
     *     file: string,
     *     label: string,
     *     slide: array<string, mixed>
     * }>
     */
    public function search(string $query, string $type = 'all', int $limit = 60): array
    {
        $normalizedQuery = $this->normalizeArabic($query);
        if ($normalizedQuery === '') {
            return [];
        }

        $results = [];
        $base = base_path();

        // 1. ALL: Search everything (Liturgy + Lectionary + Synaxarium)
        if ($type === 'all') {
            // Search Liturgy
            $this->searchLiturgyDirectory($base, $normalizedQuery, $results, $limit);
            if (count($results) >= $limit) {
                return $results;
            }

            // Search Lectionary
            $this->searchLectionaryDirectory($base, $normalizedQuery, $results, $limit);
            if (count($results) >= $limit) {
                return $results;
            }

            // Search Synaxarium
            $this->searchSynaxariumDirectory($base, $normalizedQuery, $results, $limit);
            if (count($results) >= $limit) {
                return $results;
            }
        }

        // 2. LITURGY: Search only the Divine Liturgy
        if ($type === 'liturgy') {
            $this->searchLiturgyDirectory($base, $normalizedQuery, $results, $limit);
            if (count($results) >= $limit) {
                return $results;
            }
        }

        // 3. LECTIONARY: Search only the Lectionary (Katamaros)
        if ($type === 'lectionary') {
            $this->searchLectionaryDirectory($base, $normalizedQuery, $results, $limit);
            if (count($results) >= $limit) {
                return $results;
            }
        }

        // 4. SYNAXARIUM: Search only the Synaxarium
        if ($type === 'synaxarium') {
            $this->searchSynaxariumDirectory($base, $normalizedQuery, $results, $limit);
            if (count($results) >= $limit) {
                return $results;
            }
        }

        return $results;
    }

    /**
     * Search all files in the Liturgy directory
     */
    private function searchLiturgyDirectory(string $base, string $normalizedQuery, array &$results, int $limit): void
    {
        $liturgyPath = $base . DIRECTORY_SEPARATOR . self::LiturgyDir;
        if (!is_dir($liturgyPath)) {
            return;
        }

        foreach (File::files($liturgyPath) as $fileInfo) {
            if (strtolower($fileInfo->getExtension()) !== 'json') {
                continue;
            }
            $this->searchLiturgyFile(
                $fileInfo->getPathname(),
                $fileInfo->getFilename(),
                $normalizedQuery,
                $results,
                $limit
            );
            if (count($results) >= $limit) {
                return;
            }
        }
    }

    /**
     * Search all files in the Lectionary directory (excluding Synaxarium)
     */
    private function searchLectionaryDirectory(string $base, string $normalizedQuery, array &$results, int $limit): void
    {
        $lectionaryPath = $base . DIRECTORY_SEPARATOR . self::LectionaryDir;
        if (!is_dir($lectionaryPath)) {
            return;
        }

        foreach (File::files($lectionaryPath) as $fileInfo) {
            if (strtolower($fileInfo->getExtension()) !== 'json') {
                continue;
            }
            $this->searchLectionaryFile(
                $fileInfo->getPathname(),
                $fileInfo->getFilename(),
                $normalizedQuery,
                $results,
                $limit
            );
            if (count($results) >= $limit) {
                return;
            }
        }
    }

    /**
     * Search all files in the Synaxarium directory
     */
    private function searchSynaxariumDirectory(string $base, string $normalizedQuery, array &$results, int $limit): void
    {
        $synaxariumPath = $base . DIRECTORY_SEPARATOR . self::SynaxariumDir;
        if (!is_dir($synaxariumPath)) {
            return;
        }

        foreach (File::files($synaxariumPath) as $fileInfo) {
            if (strtolower($fileInfo->getExtension()) !== 'json') {
                continue;
            }
            $this->searchSynaxariumFile(
                $fileInfo->getPathname(),
                $fileInfo->getFilename(),
                $normalizedQuery,
                $results,
                $limit
            );
            if (count($results) >= $limit) {
                return;
            }
        }
    }

    /**
     * Search a single Lectionary file for matching content
     *
     * @param string $path Full path to the file
     * @param string $filename Name of the file
     * @param string $normalizedQuery Normalized search query
     * @param array<int, array<string, mixed>> $results Reference to results array
     * @param int $limit Maximum results limit
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
        $dayKey = pathinfo($filename, PATHINFO_FILENAME);

        foreach ($data as $sectionKey => $items) {
            // Skip metadata keys
            if (in_array($sectionKey, ['Day', 'style', 'seasonLabel', 'synaxarium'], true)) {
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
                    'id' => 'global-lectionary-'.$dayKey.'-'.$sectionKey.'-'.($rIndex + 1),
                    'day_key' => $dayKey,
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
     * Normalize lectionary section items into a consistent format
     *
     * @param array<int, mixed> $items Raw section items
     * @return array<int, array<string, mixed>>
     */
    private function normalizeLectionarySectionItems(array $items): array
    {
        if ($items === []) {
            return [];
        }

        // Handle string-based sections (e.g., ["Title", "line1", "line2"])
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

        // Handle array-based sections
        $out = [];
        foreach ($items as $item) {
            if (is_array($item) && isset($item['text_ar'])) {
                $out[] = $item;
            }
        }

        return $out;
    }

    /**
     * Search a single Synaxarium file for matching content
     */
    private function searchSynaxariumFile(string $path, string $filename, string $normalizedQuery, array &$results, int $limit): void
    {
        $raw = file_get_contents($path);
        if ($raw === false) return;

        $data = json_decode($raw, true);
        if (! is_array($data) || ! isset($data['content'])) return;

        $textContent = $data['content'];
        $textAr = array_values(array_filter(array_map('trim', explode("\n", $textContent))));

        // Use the CopticDateService to format the date verbally
        $copticDate = $data['coptic_date'] ?? $filename;
        $formattedDate = $this->copticDateService->formatSearchLabel($copticDate, 'verbal');

        // Clean the first line: remove numbers and extract only the title
        $firstLine = !empty($textAr) ? $textAr[0] : '';
        $cleanTitle = $this->cleanSynaxariumTitle($firstLine);

        // Use cleaned title for display
        $title = $cleanTitle ?: 'السنكسار';

        $lines = [];
        foreach ($textAr as $text) {
            $lines[] = ['text' => $text, 'class' => ''];
        }

        if (! $this->linesMatch($lines, $normalizedQuery)) {
            return;
        }

        $dayKey = pathinfo($filename, PATHINFO_FILENAME);

        $slide = [
            'id' => 'global-synaxarium-'.$dayKey,
            'day_key' => $dayKey,
            'section_code' => 'synaxarium',
            'section_name' => 'السنكسار',
            'title' => $title,
            'intonation' => $formattedDate,
            'conclusion' => null,
            'lines' => $lines,
            'has_coptic' => false,
        ];

        $results[] = [
            'source' => 'synaxarium',
            'file' => $filename,
            'label' => 'السنكسار — ' . $formattedDate . ($cleanTitle ? ' — ' . $cleanTitle : ''),
            'slide' => $slide,
        ];
    }

    /**
     * Clean the synaxarium title by removing numbers and unnecessary prefixes
     *
     * @param string $title Raw title from the first line
     * @return string Cleaned title
     */
    private function cleanSynaxariumTitle(string $title): string
    {
        // Remove leading numbers and dots (e.g., "1. ", "2- ", "3- استشهاد...")
        $title = preg_replace('/^[\d]+[\s\.\-–—]*/', '', $title);

        // Remove أي تكرار لـ "السنكسار" في بداية النص
        $title = preg_replace('/^السنكسار[\s\-–—]*/', '', $title);

        // Remove أي تكرار لـ "اليوم" في بداية النص
        $title = preg_replace('/^اليوم[\s\d\/\-–—]*/', '', $title);

        // Trim extra spaces
        $title = trim($title);

        return $title;
    }

    /**
     * Search a single Liturgy file for matching content
     *
     * @param string $path Full path to the file
     * @param string $filename Name of the file
     * @param string $normalizedQuery Normalized search query
     * @param array<int, array<string, mixed>> $results Reference to results array
     * @param int $limit Maximum results limit
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
        $dayKey = pathinfo($filename, PATHINFO_FILENAME);

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
                'day_key' => $dayKey,
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
     * Check if any line in the given set matches the search query
     *
     * @param array<int, array<string, mixed>> $lines Array of line objects
     * @param string $normalizedQuery Normalized search query
     * @return bool True if at least one line matches
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

    /**
     * Normalize Arabic text by removing diacritics and unifying characters
     *
     * @param string $str The text to normalize
     * @return string Normalized text
     */
    private function normalizeArabic(string $str): string
    {
        // Remove Tashkeel (diacritics) and Tatweel (Kashida)
        $str = preg_replace('/[\x{0640}\x{064B}-\x{065F}\x{0670}]/u', '', $str) ?? '';

        // Unify Hamza variants to a single form
        $str = str_replace(['أ', 'إ', 'آ'], 'ا', $str);
        $str = str_replace('ؤ', 'و', $str);
        $str = str_replace('ئ', 'ي', $str);

        // Unify Ta Marbuta to Ha
        $str = str_replace('ة', 'ه', $str);

        // Unify Alef Maksura to Ya
        $str = str_replace('ى', 'ي', $str);

        return mb_strtolower($str, 'UTF-8');
    }
}
