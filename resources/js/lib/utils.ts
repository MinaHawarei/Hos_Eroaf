import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(href: InertiaLinkProps['href']) {
    return typeof href === 'string' ? href : (href as any)?.url;
}
