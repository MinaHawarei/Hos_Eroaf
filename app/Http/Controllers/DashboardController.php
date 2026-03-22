<?php

namespace App\Http\Controllers;

use App\Services\ReadingResolverService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly ReadingResolverService $resolver,
    ) {}

    public function __invoke(Request $request): Response
    {

        $dateQuery = $request->query('day');


        try {
            // 1. تحديد التاريخ (إما المرسل أو اليوم)
            $date = $dateQuery
                ? Carbon::createFromFormat('Y-m-d', $dateQuery)
                : Carbon::today();
            $date->setTimeFrom(Carbon::now());

        } catch (\Exception $e) {
            $date = Carbon::now();
        }
        $targetDate = $date->copy();
        if ($targetDate->hour >= 18) {
            $targetDate->addDay();
        }
        $dayData = $this->resolver->resolveForDate($targetDate);
        return Inertia::render('Dashboard', [
            'copticDate' => [
                'day' => $dayData->copticDay,
                'month' => $dayData->copticMonthName,
                'year' => $dayData->copticYear,
                'formatted' => $dayData->copticFormatted,
            ],
            'gregorianDate' => $date->translatedFormat('l j F Y'),
            'gregorianDateISO' => $date->format('Y-m-d'),
            'dayName' => $date->translatedFormat('l'),
            'season' => $dayData->season,
            'seasonLabel' => $dayData->seasonLabel,
            'dayKey' => $dayData->copticDayIndex,
        ]);
    }

}
