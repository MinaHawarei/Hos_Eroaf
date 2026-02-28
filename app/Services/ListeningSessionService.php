<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class ListeningSessionService
{
    private const CACHE_PREFIX = 'listen_session_';
    private const WINDOW_SIZE = 3;

    public function startSession(string $sessionId, string $dayKey)
    {
        Cache::put(self::CACHE_PREFIX . $sessionId, [
            'dayKey' => $dayKey,
            'history' => [],
            'currentMode' => 'arabic',
            'lastLineId' => null,
        ], now()->addHour());
    }

    public function getDayKey(string $sessionId): ?string
    {
        $session = Cache::get(self::CACHE_PREFIX . $sessionId);
        return $session['dayKey'] ?? null;
    }

    public function processResult(string $sessionId, array $matchResult): array
    {
        $session = Cache::get(self::CACHE_PREFIX . $sessionId);
        if (!$session) return $matchResult;

        // Smoothing: Add to history
        $session['history'][] = $matchResult;
        if (count($session['history']) > self::WINDOW_SIZE) {
            array_shift($session['history']);
        }

        // Mode Switching Logic
        $modes = collect($session['history'])->pluck('mode');
        if ($modes->unique()->count() === 1) {
            $session['currentMode'] = $modes->first();
        }

        $session['lastLineId'] = $matchResult['lineId'] ?? $session['lastLineId'];
        
        Cache::put(self::CACHE_PREFIX . $sessionId, $session, now()->addHour());

        return [
            'lineId' => $session['lastLineId'],
            'mode' => $session['currentMode'],
            'confidence' => $matchResult['confidence'],
        ];
    }
}
