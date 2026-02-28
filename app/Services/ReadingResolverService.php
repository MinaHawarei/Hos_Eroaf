<?php

namespace App\Services;

use App\DTOs\ReadingDayDTO;
use App\Models\ReadingDay;
use App\Models\ReadingSection;
use Carbon\Carbon;

/**
 * Resolves the liturgical reading day for a given Gregorian date.
 *
 * Responsibilities:
 * 1. Convert Gregorian date → Coptic date (offline)
 * 2. Determine liturgical season and date key
 * 3. Fetch reading sections from the database
 * 4. Return a ReadingDayDTO
 */
class ReadingResolverService
{
    /**
     * Coptic month names in Arabic.
     */
    private const COPTIC_MONTHS = [
        1  => 'توت',
        2  => 'بابه',
        3  => 'هاتور',
        4  => 'كيهك',
        5  => 'طوبة',
        6  => 'أمشير',
        7  => 'برمهات',
        8  => 'برمودة',
        9  => 'بشنس',
        10 => 'بؤونة',
        11 => 'أبيب',
        12 => 'مسرى',
        13 => 'نسيء',        // Epagomenal / Nasie (5-6 extra days)
    ];

    /**
     * Season labels in Arabic.
     */
    private const SEASON_LABELS = [
        'annual'      => 'السنوي',
        'great_lent'  => 'الصوم الكبير',
        'holy_week'   => 'أسبوع الآلام',
        'pentecost'   => 'الخماسين المقدسة',
        'jonah_fast'  => 'صوم يونان',
        'apostles_fast' => 'صوم الرسل',
        'nativity_fast' => 'صوم الميلاد',
        'advent'      => 'الميلاد',
    ];

    /**
     * Resolve reading data for a given date.
     */
    public function resolveForDate(Carbon $date): ReadingDayDTO
    {
        // Step 1: Convert to Coptic date
        [$copticDay, $copticMonth, $copticYear] = $this->gregorianToCoptic($date);

        // Step 2: Determine season
        $season = $this->determineSeason($date, $copticDay, $copticMonth);

        // Step 3: Build date key (Gregorian for lookup)
        $dateKey = $date->format('Y-m-d');

        // Step 4: Fetch sections with reading counts
        $readingDay = ReadingDay::where('date_key', $dateKey)->first();

        $sections = [];
        if ($readingDay) {
            $sections = ReadingSection::orderBy('order')
                ->get()
                ->map(function (ReadingSection $section) use ($readingDay) {
                    $count = $readingDay->readings()
                        ->where('section_id', $section->id)
                        ->count();

                    return [
                        'id' => $section->id,
                        'code' => $section->code,
                        'name_ar' => $section->name_ar,
                        'reading_count' => $count,
                    ];
                })
                ->filter(fn ($s) => $s['reading_count'] > 0)
                ->values()
                ->toArray();
        }

        $monthName = self::COPTIC_MONTHS[$copticMonth] ?? '';

        return new ReadingDayDTO(
            dateKey: $dateKey,
            copticDay: $copticDay,
            copticMonth: $copticMonth,
            copticMonthName: $monthName,
            copticYear: $copticYear,
            copticFormatted: "{$copticDay} {$monthName} {$copticYear} ش",
            season: $season,
            seasonLabel: self::SEASON_LABELS[$season] ?? 'السنوي',
            sections: $sections,
        );
    }

    /**
     * Convert a Gregorian date to Coptic date.
     *
     * The Coptic calendar starts on September 11 (or 12 in a Gregorian leap year).
     * Year 1 AM (Anno Martyrum) = 284 AD.
     *
     * Algorithm:
     * - Calculate total days since a reference point.
     * - The Coptic year has 12 months of 30 days + 1 month of 5/6 days.
     *
     * @return array{0: int, 1: int, 2: int} [day, month, year]
     */
    public function gregorianToCoptic(Carbon $date): array
    {
        // Julian Day Number calculation for the Gregorian date
        $jdn = $this->gregorianToJDN($date->year, $date->month, $date->day);

        // Coptic epoch: 1 Tout 1 AM = August 29, 284 AD (Julian) = JDN 1825030
        // But we need to use the proleptic Julian correlation.
        // The Coptic calendar epoch in JDN is 1825030 (August 29, 0284 Julian).
        $copticEpoch = 1825030;

        // Days since Coptic epoch
        $daysSinceEpoch = $jdn - $copticEpoch;

        // Each Coptic 4-year cycle = 1461 days (365*3 + 366)
        $cycle = intdiv($daysSinceEpoch, 1461);
        $remainder = $daysSinceEpoch % 1461;

        // Fix for negative remainders
        if ($remainder < 0) {
            $cycle--;
            $remainder += 1461;
        }

        $year = $cycle * 4;

        if ($remainder < 366) {
            // First year of cycle (leap year)
            $dayOfYear = $remainder;
        } else {
            $remainder -= 366;
            $year++;
            $extraYears = intdiv($remainder, 365);
            $dayOfYear = $remainder % 365;
            $year += $extraYears;
        }

        // Year is 0-indexed from epoch, add 1 for 1-based year
        $year += 1;

        // Month (each month = 30 days, except month 13 = 5 or 6 days)
        $month = intdiv($dayOfYear, 30) + 1;
        $day = $dayOfYear % 30 + 1;

        // Cap month to 13
        if ($month > 13) {
            $month = 13;
            $day = $dayOfYear - 360 + 1;
        }

        return [$day, $month, $year];
    }

    /**
     * Convert Gregorian date to Julian Day Number.
     */
    private function gregorianToJDN(int $year, int $month, int $day): int
    {
        // Algorithm from Meeus, "Astronomical Algorithms"
        $a = intdiv(14 - $month, 12);
        $y = $year + 4800 - $a;
        $m = $month + 12 * $a - 3;

        return $day
            + intdiv(153 * $m + 2, 5)
            + 365 * $y
            + intdiv($y, 4)
            - intdiv($y, 100)
            + intdiv($y, 400)
            - 32045;
    }

    /**
     * Calculate the date of Orthodox (Coptic) Easter for a given year.
     *
     * Uses the Julian computus (Meeus algorithm) then converts to Gregorian.
     *
     * @param int $year Gregorian year
     * @return Carbon
     */
    public function orthodoxEaster(int $year): Carbon
    {
        // Julian computus
        $a = $year % 4;
        $b = $year % 7;
        $c = $year % 19;
        $d = (19 * $c + 15) % 30;
        $e = (2 * $a + 4 * $b - $d + 34) % 7;

        $month = intdiv($d + $e + 114, 31);  // 3 = March, 4 = April (Julian)
        $day = (($d + $e + 114) % 31) + 1;

        // Convert Julian to Gregorian by adding the century correction
        // For 1900-2099: +13 days
        // For 2100-2199: +14 days
        $centuryCorrection = 13;
        if ($year >= 2100) {
            $centuryCorrection = 14;
        }

        // Create the Julian date and add correction
        $easterJulian = Carbon::createFromDate($year, $month, $day);
        $easterGregorian = $easterJulian->addDays($centuryCorrection);

        return $easterGregorian;
    }

    /**
     * Determine the liturgical season for a given date.
     *
     * Season rules:
     * - Jonah Fast: 3 days, starts Monday 2 weeks before Great Lent
     * - Great Lent: 55 days before Easter (including Holy Week)
     * - Holy Week: last 7 days of Great Lent
     * - Pentecost (Khamsin): 50 days after Easter
     * - Apostles Fast: day after Pentecost until Epib 5 (July 12)
     * - Nativity Fast: Hatour 16 (Nov 25) to Kiahk 29 (Jan 7)
     * - Annual: everything else
     */
    public function determineSeason(Carbon $date, int $copticDay, int $copticMonth): string
    {
        $year = $date->year;
        $easter = $this->orthodoxEaster($year);

        // Days relative to Easter
        $daysFromEaster = $date->diffInDays($easter, false);
        // Negative = before Easter, positive = after Easter

        // If date is early in the year and Easter is later
        $diffToEaster = $easter->diffInDays($date, false);

        // Holy Week: 7 days before Easter (Palm Sunday to Easter Eve)
        if ($diffToEaster >= 0 && $diffToEaster <= 6) {
            return 'holy_week';
        }

        // Great Lent: 55 days before Easter (minus Holy Week = days 7..55 before Easter)
        if ($diffToEaster >= 7 && $diffToEaster <= 55) {
            return 'great_lent';
        }

        // Jonah Fast: 3 days, starting Monday 2 weeks before Great Lent
        // Great Lent start = Easter - 55 days
        $greatLentStart = $easter->copy()->subDays(55);
        $jonahStart = $greatLentStart->copy()->subDays(14); // 2 weeks before
        $jonahEnd = $jonahStart->copy()->addDays(2); // 3 days

        if ($date->between($jonahStart, $jonahEnd)) {
            return 'jonah_fast';
        }

        // Pentecost: 50 days after Easter
        if ($diffToEaster < 0 && abs($diffToEaster) <= 50) {
            return 'pentecost';
        }

        // Apostles Fast: day after Pentecost to Epib 5 (July 12 Gregorian)
        $pentecostEnd = $easter->copy()->addDays(50);
        $apostlesFastEnd = Carbon::createFromDate($year, 7, 12);
        if ($date->gt($pentecostEnd) && $date->lte($apostlesFastEnd)) {
            return 'apostles_fast';
        }

        // Nativity Fast: approx Nov 25 to Jan 7
        $nativityFastStart = Carbon::createFromDate($year, 11, 25);
        $nativityFastEnd = Carbon::createFromDate($year + 1, 1, 7);
        if ($date->gte($nativityFastStart) && $date->lte($nativityFastEnd)) {
            return 'nativity_fast';
        }
        // Check if we're in Jan 1-7 of the current year (end of previous year's fast)
        $prevNativityEnd = Carbon::createFromDate($year, 1, 7);
        if ($date->lte($prevNativityEnd) && $date->month === 1) {
            return 'nativity_fast';
        }

        return 'annual';
    }
}
