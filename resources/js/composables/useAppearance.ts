import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';
export type ResolvedAppearance = 'light' | 'dark';

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

export function initializeTheme(): void {
    if (typeof window === 'undefined') return;
    const savedAppearance = localStorage.getItem('appearance') as Appearance | null;
    updateTheme(savedAppearance || 'system');

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const current = localStorage.getItem('appearance') as Appearance | null;
        updateTheme(current || 'system');
    });
}

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
