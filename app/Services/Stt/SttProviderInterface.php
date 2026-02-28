<?php

namespace App\Services\Stt;

interface SttProviderInterface
{
    /**
     * Convert audio binary data to text.
     */
    public function transcript(string $audioData): string;
}
