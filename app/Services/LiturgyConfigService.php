<?php

namespace App\Services;

class LiturgyConfigService
{
    /**
     * Get the liturgy configuration array for a given season and day.
     *
     * @param string $season
     * @param string $dayName
     * @return array
     */
    public function getConfig(string $season, string $dayName): array
    {
        // Try to load the specific season config, fallback to annual if not found
        $fileConfigs = config("liturgy.{$season}");

        if (empty($fileConfigs)) {
            $fileConfigs = config('liturgy.annual', []);
        }

        // Apply fast-specific logic
        $FastingDays = ['الأربعاء', 'الجمعة'];
        $FastingSeasons = ['apostles_fast', 'nativity_fast', 'jonah_fast', 'great_lent'];

        $isGreatLentSunday = ($season === 'great_lent' && $dayName === 'الأحد');
        $isRegularFastingDay = in_array($season, $FastingSeasons)
                            && in_array($dayName, $FastingDays)
                            && $season !== 'pentecost';

        if (isset($fileConfigs["aliloia_fay_be"])) {
            if ($isGreatLentSunday || $isRegularFastingDay) {
                $fileConfigs["aliloia_fay_be"] = 'الليلويا جي افمفئي';
            } elseif (in_array($season, $FastingSeasons)) {
                $fileConfigs["aliloia_fay_be"] = 'الليلويا إي إ';
            }
        }

        return $fileConfigs;
    }
}
