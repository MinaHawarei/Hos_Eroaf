import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';
export type ResolvedAppearance = 'light' | 'dark';

/**
 * Updates the document root class to reflect the chosen theme.
 * Handles system-preference media queries when in 'system' mode.
 */
export function updateTheme(value: Appearance): void {
    if (typeof window === 'undefined') return;

    if (value === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
    } else {
        document.documentElement.classList.toggle('dark', value === 'dark');
    }
}

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

/**
 * Bootstraps the theme on initial app load.
 * Sets the initial <html> class and listens for OS-level theme changes.
 */
export function initializeTheme(): void {
    if (typeof window === 'undefined') return;
    const savedAppearance = localStorage.getItem('appearance') as Appearance | null;
    updateTheme(savedAppearance || 'system');

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const current = localStorage.getItem('appearance') as Appearance | null;
        updateTheme(current || 'system');
    });
}

/**
 * useAppearance Hook
 * 
 * Manages the application's visual theme (Light, Dark, or System Sync).
 * Persists settings in both LocalStorage and HTTP cookies for SSR consistency.
 */
export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('appearance') as Appearance) || 'system';
        }
        return 'system';
    });

    const updateAppearance = (value: Appearance) => {
        setAppearance(value);
        localStorage.setItem('appearance', value);
        setCookie('appearance', value);
        updateTheme(value);
    };

    const resolvedAppearance: ResolvedAppearance =
        appearance === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
            : (appearance as ResolvedAppearance);

    return { appearance, resolvedAppearance, updateAppearance };
}
