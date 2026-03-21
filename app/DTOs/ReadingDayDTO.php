<?php

namespace App\DTOs;

/**
 * Data Transfer Object returned by ReadingResolverService.
 * Contains all information about a reading day, including Coptic date,
 * liturgical season, and available reading sections.
 */
class ReadingDayDTO
{
    public function __construct(
        public readonly string $dateKey,
        public readonly int $copticDay,
        public readonly int $copticMonth,
        public readonly string $copticMonthName,
        public readonly int $copticYear,
        public readonly string $copticFormatted,
        public readonly int $copticDayIndex,
        public readonly string $season,
        public readonly string $seasonLabel,
        public readonly array $sections,
    ) {}
}
