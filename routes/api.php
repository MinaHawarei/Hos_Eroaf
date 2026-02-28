<?php

use App\Http\Controllers\Api\ListeningController;
use App\Http\Controllers\Api\DayController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

Route::prefix('listen')->group(function () {
    Route::post('/start', [ListeningController::class, 'start']);
    Route::post('/chunk', [ListeningController::class, 'chunk']);
    Route::post('/stop', [ListeningController::class, 'stop']);
});

Route::get('/day/{date}', [DayController::class, 'show']);
Route::get('/search', [SearchController::class, 'search']);
