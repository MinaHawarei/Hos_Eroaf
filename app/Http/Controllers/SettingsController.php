<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Settings', [
            'lastUpdated' => Setting::getValue('last_content_update'),
            'appVersion' => config('app.version', '1.0.0'),
            'currentReadingsVersion' => Setting::getValue('readings_version'),
        ]);
    }
}
