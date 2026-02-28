<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReadingDay;
use App\Models\ReadingLine;
use App\Services\ListeningSessionService;
use App\Services\Stt\SttProviderInterface;
use App\Services\TranscriptMatchingService;
use App\Services\TranscriptNormalizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ListeningController extends Controller
{
    public function __construct(
        private readonly SttProviderInterface $stt,
        private readonly TranscriptNormalizationService $normalization,
        private readonly TranscriptMatchingService $matcher,
        private readonly ListeningSessionService $sessionService
    ) {}

    public function start(Request $request)
    {
        $request->validate([
            'dayKey' => 'required|string',
        ]);

        $sessionId = Str::random(16);
        $this->sessionService->startSession($sessionId, $request->dayKey);

        return response()->json(['sessionId' => $sessionId]);
    }

    public function chunk(Request $request)
    {
        $request->validate([
            'sessionId' => 'required|string',
            'audio' => 'required|string', // Audio data (string for mock, binary/base64 for real)
        ]);

        // 1. Get raw text from STT
        $rawText = $this->stt->transcript($request->audio);
        
        // 2. Normalize
        $normalizedText = $this->normalization->normalize($rawText);

        // 3. Get lines for this day
        $dayKey = $this->sessionService->getDayKey($request->sessionId);
        if (!$dayKey) {
            return response()->json(['error' => 'Invalid session'], 404);
        }

        $readingDay = ReadingDay::where('date_key', $dayKey)->first();
        if (!$readingDay) {
            return response()->json(['error' => 'No readings for this day'], 404);
        }

        // Get all lines for today's readings to match against
        $lines = ReadingLine::whereIn('reading_id', $readingDay->readings()->pluck('id'))->get();

        // 4. Match
        $rawMatch = $this->matcher->findBestMatch($normalizedText, $lines);

        // 5. Smooth & Update Session
        $finalResult = $this->sessionService->processResult($request->sessionId, $rawMatch);

        return response()->json($finalResult);
    }

    public function stop(Request $request)
    {
        return response()->json(['status' => 'stopped']);
    }
}
