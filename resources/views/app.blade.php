<!DOCTYPE html>
<html lang="ar" dir="rtl" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="هوس إيروف - تطبيق القراءات الكنسية القبطية الأرثوذكسية">

        {{-- Inline script to detect system dark mode preference --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';
                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        <style>
            html { background-color: #F5E6C8; }
            html.dark { background-color: #121212; }
        </style>

        <title inertia>{{ config('app.name', 'هوس إيروف') }}</title>

        <link rel="icon" href="/icon.png" sizes="any">
        <link rel="icon" href="/icon.png" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        {{-- Coptic / Liturgical Appearance Fonts --}}
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
