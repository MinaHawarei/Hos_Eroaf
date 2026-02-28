import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { initializeTheme } from './composables/useAppearance';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'هوس إيروف';

import { DayProvider } from './contexts/DayContext';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <DayProvider>
                <App {...props} />
            </DayProvider>
        );
    },
    progress: {
        color: '#d97706', // Primary amber gold
    },
});

// Sync theme preference on load
initializeTheme();
