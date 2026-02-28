import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                return;
            }

            // Command + K or Ctrl + K for search for instance
            if ((e.ctrlKey || e.metaKey) && e.key === 'k' && shortcuts['ctrl+k']) {
                e.preventDefault();
                shortcuts['ctrl+k']();
            }

            if (shortcuts[e.key]) {
                // e.preventDefault(); // careful with spacebar
                shortcuts[e.key]();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
