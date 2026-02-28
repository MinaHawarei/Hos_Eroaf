import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        tailwindcss(),
        react(),
        wayfinder({
            formVariants: true,
        }),
    ],
    server: {
        hmr: {
            host: 'hos_erof.test',
        },
    },
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
});
