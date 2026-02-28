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
        $dateQuery = $request->query('date');
        try {
            $date = $dateQuery ? Carbon::createFromFormat('Y-m-d', $dateQuery) : Carbon::today();
        } catch (\Exception $e) {
            $date = Carbon::today();
        }

        $dayData = $this->resolver->resolveForDate($date);

        return Inertia::render('Dashboard', [
            'copticDate' => [
                'day' => $dayData->copticDay,
                'month' => $dayData->copticMonthName,
                'year' => $dayData->copticYear,
                'formatted' => $dayData->copticFormatted,
            ],
            'gregorianDate' => $date->translatedFormat('l j F Y'),
            'season' => $dayData->season,
            'seasonLabel' => $dayData->seasonLabel,
            'dayKey' => $dayData->dateKey,
            'sections' => $dayData->sections,
        ]);
    }
}
