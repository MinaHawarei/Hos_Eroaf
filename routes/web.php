<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReaderController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\PresentationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| HosErof Web Routes
|--------------------------------------------------------------------------
|
| All routes serve Arabic RTL pages via Inertia.
| No authentication required for reading — this is a liturgical app.
|
*/

// Dashboard — today's readings overview
Route::get('/', DashboardController::class)->name('home');

// Reader — view readings for a specific day
Route::get('/reader/{dayKey}', [ReaderController::class, 'show'])->name('reader.show');

// Presentation — fullscreen presentation of liturgy
Route::get('/presentation/{dayKey}', [PresentationController::class, 'show'])->name('presentation.show');

// Settings
Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
