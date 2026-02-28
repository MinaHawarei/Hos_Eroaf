<?php

namespace App\Services\Stt;

/**
 * Mock provider for MVP development. 
 */
class MockSttProvider implements SttProviderInterface
{
    public function transcript(string $audioData): string
    {
        // For MVP testing, returns the data as text if it's a string,
        // mimicking a perfect transcription.
        return $audioData; 
    }
}
