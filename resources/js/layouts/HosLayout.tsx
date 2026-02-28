import { useAppearance, type Appearance } from '@/composables/useAppearance';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    ChevronLeft,
    Home,
    Menu,
    Monitor,
    Moon,
    Settings,
    Sun,
    X,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

type Props = {
    title?: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    children: React.ReactNode;
};

export default function HosLayout({ title = '', breadcrumbs = [], children }: Props) {
    const { url } = usePage();
    const { appearance, updateAppearance } = useAppearance();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Navigation items — all in Arabic
    const navItems = useMemo(() => [
        { label: 'الرئيسية', href: '/', icon: Home },
        { label: 'الإعدادات', href: '/settings', icon: Settings },
    ], []);

    // Theme options
    const themeOptions: Array<{ value: Appearance; icon: any; label: string }> = [
        { value: 'light', icon: Sun, label: 'فاتح' },
        { value: 'dark', icon: Moon, label: 'داكن' },
        { value: 'system', icon: Monitor, label: 'تلقائي' },
    ];

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    return (
        <>
            <Head title={title} />

            <div className="min-h-screen bg-background text-foreground" dir="rtl">
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-xl">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                        {/* Logo + Brand */}
                        <div className="flex items-center gap-3">
                            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base font-bold leading-tight tracking-tight">
                                        هوس إيروف
                                    </span>
                                    <span className="text-[10px] leading-none text-muted-foreground">
                                        القراءات الكنسية
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden items-center gap-1 md:flex">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${url === item.href
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {/* Theme Switcher */}
                            <div className="hidden items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5 sm:flex">
                                {themeOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateAppearance(opt.value)}
                                        className={`rounded-md p-1.5 transition-all ${appearance === opt.value
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        title={opt.label}
                                    >
                                        <opt.icon className="h-4 w-4" />
                                    </button>
                                ))}
                            </div>

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={toggleMobileMenu}
                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                            >
                                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    {mobileMenuOpen && (
                        <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <nav className="flex flex-col gap-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${url === item.href
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>

                            {/* Mobile theme switcher */}
                            <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
                                <span className="ml-2 text-xs text-muted-foreground">المظهر:</span>
                                <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
                                    {themeOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateAppearance(opt.value)}
                                            className={`rounded-md p-1.5 transition-all ${appearance === opt.value
                                                    ? 'bg-card text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            title={opt.label}
                                        >
                                            <opt.icon className="h-3.5 w-3.5" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </header>

                {/* Breadcrumbs */}
                {breadcrumbs.length > 0 && (
                    <div className="border-b border-border bg-muted/30">
                        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 sm:px-6">
                            {breadcrumbs.map((crumb, index) => (
                                <React.Fragment key={index}>
                                    {crumb.href ? (
                                        <Link
                                            href={crumb.href}
                                            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className="text-xs font-medium text-foreground">
                                            {crumb.label}
                                        </span>
                                    )}
                                    {index < breadcrumbs.length - 1 && (
                                        <ChevronLeft className="h-3 w-3 text-muted-foreground/50" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t border-border bg-card/50">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
                        <p className="text-center text-xs text-muted-foreground">
                            هوس إيروف — تطبيق القراءات الكنسية القبطية الأرثوذكسية
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
