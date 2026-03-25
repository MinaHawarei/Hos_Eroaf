<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PresentationController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ContentManagerController;
use Illuminate\Support\Facades\Route;

// Dashboard — today's readings overview
Route::get('/', DashboardController::class)->name('home');

// Presentation — fullscreen presentation of liturgy
Route::prefix('presentation')->group(function () {
    Route::get('/lectionary/{dayKey}', [PresentationController::class, 'lectionary'])->name('presentation.lectionary');
    Route::get('/liturgy', [PresentationController::class, 'liturgy'])->name('presentation.liturgy');
    Route::get('/search', [PresentationController::class, 'search'])
        ->middleware('throttle:60,1')
        ->name('presentation.search');

    // Mirror Mode — synchronized display
    Route::get('/mirror', [PresentationController::class, 'mirror'])->name('mirror');

    Route::get('/{dayKey}', [PresentationController::class, 'lectionary'])->name('presentation.show');
});

// Content Management System
Route::prefix('admin/content')->group(function () {
    Route::get('/', [ContentManagerController::class, 'index'])->name('content.index');
    Route::get('/{category}/{filename}', [ContentManagerController::class, 'show'])->name('content.show');
    Route::post('/update', [ContentManagerController::class, 'update'])->name('content.update');
});

// Settings
Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
Route::post('/settings/church', [SettingsController::class, 'update'])->name('settings.update-church');
