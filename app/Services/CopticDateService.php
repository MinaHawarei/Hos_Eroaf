<?php

namespace App\Services;

/**
 * Service for handling Coptic calendar date conversions and formatting
 */
class CopticDateService
{
    /**
     * Coptic month names in Arabic
     */
    private const MONTHS_AR = [
        1 => 'توت',
        2 => 'بابه',
        3 => 'هاتور',
        4 => 'كيهك',
        5 => 'طوبه',
        6 => 'أمشير',
        7 => 'برمهات',
        8 => 'برموده',
        9 => 'بشنس',
        10 => 'بؤونه',
        11 => 'إبؤيب',
        12 => 'مسرى',
        13 => 'نسئ',
    ];

    /**
     * Arabic number words for days (1-31)
     */
    private const DAY_NUMBERS_AR = [
        1 => 'الأول',
        2 => 'الثاني',
        3 => 'الثالث',
        4 => 'الرابع',
        5 => 'الخامس',
        6 => 'السادس',
        7 => 'السابع',
        8 => 'الثامن',
        9 => 'التاسع',
        10 => 'العاشر',
        11 => 'الحادي عشر',
        12 => 'الثاني عشر',
        13 => 'الثالث عشر',
        14 => 'الرابع عشر',
        15 => 'الخامس عشر',
        16 => 'السادس عشر',
        17 => 'السابع عشر',
        18 => 'الثامن عشر',
        19 => 'التاسع عشر',
        20 => 'العشرون',
        21 => 'الحادي والعشرون',
        22 => 'الثاني والعشرون',
        23 => 'الثالث والعشرون',
        24 => 'الرابع والعشرون',
        25 => 'الخامس والعشرون',
        26 => 'السادس والعشرون',
        27 => 'السابع والعشرون',
        28 => 'الثامن والعشرون',
        29 => 'التاسع والعشرون',
        30 => 'الثلاثون',
        31 => 'الحادي والثلاثون',
    ];

    /**
     * Coptic month names in English (for reference)
     */
    private const MONTHS_EN = [
        1 => 'Tout',
        2 => 'Baba',
        3 => 'Hatur',
        4 => 'Kiahk',
        5 => 'Toba',
        6 => 'Amshir',
        7 => 'Baramhat',
        8 => 'Baramouda',
        9 => 'Bashans',
        10 => 'Baouna',
        11 => 'Abib',
        12 => 'Misra',
        13 => 'Nasi',
    ];

    /**
     * Convert a Coptic date string or components to a formatted Arabic date
     *
     * @param string|array $date Either a date string like "1/2" or array with 'day' and 'month'
     * @param string $format Format: 'full' (day month year) or 'day_month' (day month) or 'verbal' (اليوم الثلاثون من شهر بؤونة)
     * @return string Formatted Coptic date in Arabic
     */
    public function format($date, string $format = 'day_month'): string
    {
        $parts = $this->parseDate($date);
        if ($parts === null) {
            return (string) $date;
        }

        $day = $parts['day'];
        $month = $parts['month'];
        $year = $parts['year'] ?? null;

        $monthName = $this->getMonthName($month);

        if ($format === 'verbal') {
            return $this->formatVerbal($day, $monthName);
        }

        if ($format === 'full' && $year !== null) {
            return "{$day} {$monthName} {$year}";
        }

        return "{$day} {$monthName}";
    }

    /**
     * Format date in verbal form: "اليوم الثلاثون من شهر بؤونة"
     *
     * @param int $day Day number
     * @param string $monthName Month name in Arabic
     * @return string Verbal date format
     */
    public function formatVerbal(int $day, string $monthName): string
    {
        $dayWord = $this->getDayWord($day);
        return "اليوم {$dayWord} من شهر {$monthName}";
    }

    /**
     * Get the Arabic word for a day number
     *
     * @param int $day Day number (1-31)
     * @return string Day number in Arabic words
     */
    public function getDayWord(int $day): string
    {
        return self::DAY_NUMBERS_AR[$day] ?? (string) $day;
    }

    /**
     * Get the Arabic name of a Coptic month
     *
     * @param int $month Month number (1-13)
     * @return string Month name in Arabic
     */
    public function getMonthName(int $month): string
    {
        return self::MONTHS_AR[$month] ?? (string) $month;
    }

    /**
     * Get the English name of a Coptic month
     *
     * @param int $month Month number (1-13)
     * @return string Month name in English
     */
    public function getMonthNameEn(int $month): string
    {
        return self::MONTHS_EN[$month] ?? (string) $month;
    }

    /**
     * Parse a Coptic date from various formats
     *
     * @param string|array $date Date string like "2/1" or array with day/month/year
     * @return array{day: int, month: int, year?: int}|null
     */
    public function parseDate($date): ?array
    {
        // If it's already an array
        if (is_array($date)) {
            $day = (int) ($date['day'] ?? $date[0] ?? 0);
            $month = (int) ($date['month'] ?? $date[1] ?? 0);
            $year = isset($date['year']) ? (int) $date['year'] : null;

            if ($day > 0 && $month > 0) {
                $result = ['day' => $day, 'month' => $month];
                if ($year !== null) {
                    $result['year'] = $year;
                }
                return $result;
            }
            return null;
        }

        // If it's a string
        if (is_string($date)) {
            // Try format: "2/1" or "2/1/1740"
            if (preg_match('/^(\d+)\/(\d+)(?:\/(\d+))?$/', $date, $matches)) {
                $day = (int) $matches[1];
                $month = (int) $matches[2];
                $year = isset($matches[3]) ? (int) $matches[3] : null;

                if ($day > 0 && $month > 0) {
                    $result = ['day' => $day, 'month' => $month];
                    if ($year !== null) {
                        $result['year'] = $year;
                    }
                    return $result;
                }
            }

            // Try format: "1 Tout 1740"
            $monthNames = array_flip(self::MONTHS_AR);
            foreach ($monthNames as $name => $num) {
                if (preg_match('/^(\d+)\s+' . preg_quote($name, '/') . '(?:\s+(\d+))?$/u', $date, $matches)) {
                    $day = (int) $matches[1];
                    $month = $num;
                    $year = isset($matches[2]) ? (int) $matches[2] : null;

                    if ($day > 0 && $month > 0) {
                        $result = ['day' => $day, 'month' => $month];
                        if ($year !== null) {
                            $result['year'] = $year;
                        }
                        return $result;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Format a Coptic date label for search results
     *
     * @param string|array $date The date to format
     * @param string $format Format: 'short' (30 بؤونة) or 'verbal' (اليوم الثلاثون من شهر بؤونة)
     * @return string Formatted date label
     */
    public function formatSearchLabel($date, string $format = 'verbal'): string
    {
        $parts = $this->parseDate($date);
        if ($parts === null) {
            return (string) $date;
        }

        $day = $parts['day'];
        $month = $this->getMonthName($parts['month']);

        if ($format === 'short') {
            return "{$day} {$month}";
        }

        // Verbal format: "اليوم الثلاثون من شهر بؤونة"
        $dayWord = $this->getDayWord($day);
        return "اليوم {$dayWord} من شهر {$month}";
    }
}
