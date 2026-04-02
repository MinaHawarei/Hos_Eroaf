import { useEffect } from 'react';

/**
 * useKeyboardShortcuts Hook
 * 
 * A generalized utility to map keyboard keys to callback functions.
 * Automatically ignores shortcuts when the user is focused on an input,
 * textarea, or select element to prevent interference with typing.
 * 
 * @param shortcuts - A record mapping key names (e.g., 'k', 'Enter', 'ctrl+k') to callbacks.
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Safety: Do not trigger shortcuts if the user is currently typing in a form field
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
                return;
            }

            // Support for Meta/Ctrl + K (common search shortcut pattern)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k' && shortcuts['ctrl+k']) {
                e.preventDefault();
                shortcuts['ctrl+k']();
                return;
            }

            // Generic key mapping
            if (shortcuts[e.key]) {
                // Note: preventDefault is omitted here to avoid breaking default browser 
                // behaviors like Space-to-scroll, unless explicitly handled in the callback.
                shortcuts[e.key]();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
