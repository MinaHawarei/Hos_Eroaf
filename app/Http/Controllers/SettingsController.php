<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $churchSettingsRaw = $request->cookie('church_settings');
        $churchSettings = $churchSettingsRaw ? json_decode($churchSettingsRaw, true) : null;
        return Inertia::render('Settings', [
            'lastUpdated' => Setting::getValue('last_content_update'),
            'currentReadingsVersion' => Setting::getValue('readings_version'),
            'initialChurchData' => $churchSettings ?? [],
            'patronsList' => config('church.patrons', []),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'patron' => 'nullable|string',
            'popename' => 'nullable|string',
            'diocesan_bishop' => 'nullable|array',
            'diocesan_bishop.name' => 'nullable|string',
            'diocesan_bishop.role' => 'nullable|string',
            'diocesan_bishop.coRole' => 'nullable|string',
            'visiting_bishops' => 'nullable|array',
            'visiting_bishops.*.name' => 'nullable|string',
            'visiting_bishops.*.role' => 'nullable|string',
            'visiting_bishops.*.coRole' => 'nullable|string',
        ]);

        return back()->withCookie(cookie('church_settings', json_encode($validated), 60 * 24 * 365, null, null, false, false));
    }
}
