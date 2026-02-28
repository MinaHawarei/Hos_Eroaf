import { usePage } from '@inertiajs/react';
import { toUrl } from '@/lib/utils';
import type { InertiaLinkProps } from '@inertiajs/react';

export function useCurrentUrl() {
    const { url } = usePage();

    // On the server, window is not defined. Inertia's url is already the pathname + search
    const currentPath = typeof window !== 'undefined'
        ? new URL(url, window.location.origin).pathname
        : url.split('?')[0];

    const isCurrentUrl = (
        urlToCheck: NonNullable<InertiaLinkProps['href']>,
        currentUrl?: string,
    ) => {
        const urlToCompare = currentUrl ?? currentPath;
        const urlString = toUrl(urlToCheck);

        if (!urlString.startsWith('http')) {
            return urlString === urlToCompare;
        }

        try {
            const absoluteUrl = new URL(urlString);
            return absoluteUrl.pathname === urlToCompare;
        } catch {
            return false;
        }
    };

    const whenCurrentUrl = <T, F = null>(
        urlToCheck: NonNullable<InertiaLinkProps['href']>,
        ifTrue: T,
        ifFalse: F | null = null,
    ): T | F | null => {
        return isCurrentUrl(urlToCheck) ? ifTrue : ifFalse;
    };

    return {
        currentUrl: currentPath,
        isCurrentUrl,
        whenCurrentUrl,
    };
}
