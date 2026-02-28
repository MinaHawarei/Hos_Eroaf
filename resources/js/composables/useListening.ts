import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

type ListeningResult = {
    lineId: number | null;
    mode: 'arabic' | 'coptic_arabized';
    confidence: number;
};

export function useListening(dayKey: string) {
    const [isListening, setIsListening] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [result, setResult] = useState<ListeningResult>({
        lineId: null,
        mode: 'arabic',
        confidence: 0,
    });
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const intervalRef = useRef<any>(null);

    const startListening = async () => {
        try {
            // 1. Get session from backend
            const { data } = await axios.post('/api/listen/start', { dayKey });
            setSessionId(data.sessionId);

            // 2. Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
            };

            // 3. Start recording in chunks
            const processChunk = async () => {
                if (audioChunksRef.current.length === 0) return;

                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];

                // In a real implementation, we send the blob.
                // For MVP/Mock, we might send a trigger or just simulate.
                try {
                    const { data: chunkData } = await axios.post('/api/listen/chunk', {
                        sessionId,
                        audio: 'CHUNK_DATA', // Real: base64 or blob
                    });
                    setResult(chunkData);
                } catch (e) {
                    console.error('Failed to send chunk', e);
                }
            };

            // Start recorder and interval
            mediaRecorder.start();
            setIsListening(true);
            setError(null);

            // Record and send every 4 seconds as per requirements
            intervalRef.current = setInterval(() => {
                mediaRecorder.requestData();
                processChunk();
            }, 4000);

        } catch (err) {
            console.error('Listening failed', err);
            setError('تعذر الوصول إلى الميكروفون');
        }
    };

    const stopListening = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (mediaRecorderRef.current) mediaRecorderRef.current.stop();

        setIsListening(false);
        setSessionId(null);
        setResult({ lineId: null, mode: 'arabic', confidence: 0 });

        if (sessionId) {
            await axios.post('/api/listen/stop', { sessionId });
        }
    };

    return { isListening, startListening, stopListening, result, error };
}
