<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReaderController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\PresentationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;



// Dashboard — today's readings overview
Route::get('/', DashboardController::class)->name('home');

// Presentation — fullscreen presentation of liturgy
Route::get('/presentation/{dayKey}', [PresentationController::class, 'show'])->name('presentation.show');

// Settings
Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
