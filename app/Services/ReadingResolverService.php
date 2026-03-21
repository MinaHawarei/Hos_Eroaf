<?php

namespace App\Services;

use App\DTOs\ReadingDayDTO;
use App\Models\ReadingDay;
use App\Models\ReadingSection;
use Carbon\Carbon;

/**
 * Resolves the liturgical reading day for a given Gregorian date.
 */
class ReadingResolverService
{
    private const COPTIC_MONTHS = [
        1  => 'توت', 2  => 'بابه', 3  => 'هاتور', 4  => 'كيهك',
        5  => 'طوبة', 6  => 'أمشير', 7  => 'برمهات', 8  => 'برمودة',
        9  => 'بشنس', 10 => 'بؤونة', 11 => 'أبيب', 12 => 'مسرى',
        13 => 'نسيء',
    ];

    private const SEASON_LABELS = [
        'annual'        => 'السنوي',
        'great_lent'    => 'الصوم الكبير',
        'holy_week'     => 'أسبوع الآلام',
        'easter'     => 'عيد القيامة',
        'pentecost'     => 'الخماسين المقدسة',
        'jonah_fast'    => 'صوم يونان',
        'apostles_fast' => 'صوم الرسل',
        'nativity_fast' => 'صوم الميلاد',
        'advent'        => 'عيدالميلاد',
    ];

    public function resolveForDate(Carbon $date): ReadingDayDTO
    {


        $date->startOfDay();

        [$copticDay, $copticMonth, $copticYear] = $this->gregorianToCoptic($date);
        $copticDayIndex = $this->getCopticDayIndex($copticDay, $copticMonth);
        $season = $this->determineSeason($date, $copticDay, $copticMonth);
        $dateKey = $date->format('Y-m-d');

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
            copticDayIndex: $copticDayIndex,
            season: $season,
            seasonLabel: self::SEASON_LABELS[$season] ?? 'السنوي',
            sections: $sections,
        );
    }

    private function getCopticDayIndex(int $day, int $month): int
    {
        $daysBeforeMonth = ($month - 1) * 30;
        if ($month > 12) {
            $daysBeforeMonth = 360;
        }
        return $daysBeforeMonth + $day;
    }

    public function gregorianToCoptic(Carbon $date): array
    {
        $jdn = $this->gregorianToJDN($date->year, $date->month, $date->day);
        $copticEpochJDN = 1825030;
        $daysSinceEpoch = $jdn - $copticEpochJDN;

        $cycles = intdiv($daysSinceEpoch, 1461);
        $remainingDays = $daysSinceEpoch % 1461;

        if ($remainingDays < 365) {
            $yearInCycle = 0;
            $dayOfYear = $remainingDays;
        } elseif ($remainingDays < 730) {
            $yearInCycle = 1;
            $dayOfYear = $remainingDays - 365;
        } elseif ($remainingDays < 1095) {
            $yearInCycle = 2;
            $dayOfYear = $remainingDays - 730;
        } else {
            $yearInCycle = 3;
            $dayOfYear = $remainingDays - 1095;
        }

        $copticYear = ($cycles * 4) + $yearInCycle + 1;

        if ($dayOfYear < 360) {
            $copticMonth = intdiv($dayOfYear, 30) + 1;
            $copticDay = ($dayOfYear % 30) + 1;
        } else {
            $copticMonth = 13;
            $copticDay = $dayOfYear - 360 + 1;
        }

        return [$copticDay, $copticMonth, $copticYear];
    }

    private function gregorianToJDN(int $year, int $month, int $day): int
    {
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
     * يحسب عيد القيامة وفقاً للتقويم الغريغوري (الموحد العالمي).
     * هذه الخوارزمية تضمن أن يكون العيد يوم 5 أبريل في عام 2026.
     */
    public function calculateEaster(int $year): Carbon
    {
        // PHP built-in function to calculate Gregorian Easter
        $daysAfterMarch21 = easter_days($year);

        // Easter is calculated from March 21
        return Carbon::createFromDate($year, 3, 21)->addDays($daysAfterMarch21);
    }

    public function determineSeason(Carbon $date, int $copticDay, int $copticMonth): string
    {
        $year = $date->year;

        // استخدام دالة حساب العيد الجديدة
        $easter = $this->calculateEaster($year);

        // إذا كان التاريخ الحالي بعد عيد القيامة أو يساويه (لأن العيد نفسه يعتبر بداية الخماسين)
        if ($date->gte($easter)) {
            $daysAfterEaster = $easter->diffInDays($date);

            // الخماسين المقدسة: 50 يوماً تبدأ من يوم العيد (اليوم 0) حتى 49 يوماً بعده
            if ($daysAfterEaster >= 0 && $daysAfterEaster <= 49) {
                return 'pentecost';
            }

            // صوم الرسل: يبدأ من اليوم 50 بعد العيد (الإثنين) حتى 12 يوليو (أو 5 أبيب)
            $apostlesFastEnd = Carbon::createFromDate($year, 7, 12);
            if ($daysAfterEaster >= 50 && $date->lte($apostlesFastEnd)) {
                return 'apostles_fast';
            }
        }
        // إذا كان التاريخ الحالي قبل عيد القيامة
        else {
            //$daysBeforeEaster = $date->diffInDays($easter);
            $daysBeforeEaster = (int) $date->diffInDays($easter);

            if ($daysBeforeEaster == 0) {
                return 'easter';
            }
            // أسبوع الآلام: آخر 6 أيام قبل العيد (من الإثنين إلى السبت)

            if ($daysBeforeEaster >= 1 && $daysBeforeEaster <= 6) {
                return 'holy_week';
            }

            // الصوم الكبير: 55 يوماً قبل العيد (شاملة أسبوع الآلام).
            // إذن، الصوم يقع بين 7 أيام و55 يوماً قبل العيد.
            if ($daysBeforeEaster >= 7 && $daysBeforeEaster <= 55) {
                return 'great_lent';
            }

            // صوم يونان: 3 أيام. يبدأ يوم الإثنين، قبل الصوم الكبير بأسبوعين.
            // حسابياً: 55 (صوم كبير) + 14 (أسبوعين) = 69 يوماً قبل العيد.
            // إذن صوم يونان يقع بين 67 و 69 يوماً قبل العيد.
            if ($daysBeforeEaster >= 67 && $daysBeforeEaster <= 69) {
                return 'jonah_fast';
            }
        }

        // صوم الميلاد: ثابت تقريباً من 25 نوفمبر حتى 6 يناير
        // نغطي شهري نوفمبر وديسمبر
        if ($date->month === 11 && $date->day >= 25) {
            return 'nativity_fast';
        }
        if ($date->month === 12) {
            return 'nativity_fast';
        }
        // ونغطي شهر يناير حتى يوم 6
        if ($date->month === 1 && $date->day <= 6) {
            return 'nativity_fast';
        }

        // عيد الميلاد المجيد (7 يناير)
        if ($date->month === 1 && $date->day === 7) {
             return 'advent';
        }

        // الأيام العادية
        return 'annual';
    }
}
