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
     * @param string $format Format: 'full' (day month year) or 'day_month' (day month)
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

        if ($format === 'full' && $year !== null) {
            return "{$day} {$monthName} {$year}";
        }

        return "{$day} {$monthName}";
    }

    /**
     * Get the Arabic name of a Coptic month
     *
     * @param int $month Month number (1-13)
     * @return string Month name in Arabic
     */
    public function getMonthName(int $month): string
    {
        return self::MONTHS_AR[$month] ?? $month;
    }

    /**
     * Get the English name of a Coptic month
     *
     * @param int $month Month number (1-13)
     * @return string Month name in English
     */
    public function getMonthNameEn(int $month): string
    {
        return self::MONTHS_EN[$month] ?? $month;
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
     * @return string Formatted date label
     */
    public function formatSearchLabel($date): string
    {
        $parts = $this->parseDate($date);
        if ($parts === null) {
            return (string) $date;
        }

        $day = $parts['day'];
        $month = $this->getMonthName($parts['month']);

        return "{$day} {$month}";
    }
}
