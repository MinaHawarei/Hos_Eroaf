import { Head, Link } from '@inertiajs/react';
import { BookOpen, Church, ChevronLeft, Moon, Sun, Star, Sparkles, Heart } from 'lucide-react';
import AppLogoIcon from '@/components/AppLogoIcon';
import { Button } from '@/components/ui/button';

type Props = {
    canLogin?: boolean;
    canRegister?: boolean;
    laravelVersion?: string;
    phpVersion?: string;
};

export default function Welcome({ canLogin, canRegister }: Props) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-primary/20 dark:bg-[#0a0a0a] dark:text-slate-200">
            <Head title="مرحباً بك" />

            {/* Decorative Background Elements */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" />
            <div className="pointer-events-none absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-3xl dark:bg-amber-500/10" />

            <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6">
                {/* Header */}
                <header className="flex h-20 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AppLogoIcon className="h-8 w-8 text-primary" />
                        <span className="text-xl font-bold tracking-tight">هوس إيروف</span>
                    </div>

                    <nav className="flex items-center gap-4">
                        {canLogin && (
                            <Link
                                href={route('login')}
                                className="text-sm font-medium transition-colors hover:text-primary"
                            >
                                دخول
                            </Link>
                        )}
                        {canRegister && (
                            <Link
                                href={route('register')}
                                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                            >
                                ابدأ الآن
                            </Link>
                        )}
                    </nav>
                </header>

                {/* Hero Section */}
                <main className="flex flex-1 flex-col items-center justify-center py-12 text-center lg:py-24">
                    <div className="mb-6 inline-flex animate-bounce items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        تطبيق القراءات الكنسية الجديد
                    </div>

                    <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
                        صلاتك وقراءاتك الكنسية{' '}
                        <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
                            بين يديك
                        </span>
                    </h1>

                    <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
                        هوس إيروف هو رفيقك الروحي اليومي، يقدم لك قراءات القطمارس اليومية بكل سهولة وسلاسة، مع واجهة مستخدم عصرية تدعم اللغة العربية والوضع الداكن.
                    </p>

                    <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
                        <Button size="lg" className="h-14 rounded-full px-8 text-base font-bold shadow-lg" asChild>
                            <Link href={route('dashboard')}>
                                ابدأ التصفح
                                <ChevronLeft className="mr-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" className="h-14 rounded-full px-8 text-base font-semibold" asChild>
                            <a href="#features">تعرف على تطبيقنا</a>
                        </Button>
                    </div>

                    {/* App Preview Mockup */}
                    <div className="mt-20 relative px-4 sm:px-0">
                        <div className="relative mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-slate-50/50 p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900/50">
                            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                <div className="flex h-8 items-center border-b border-slate-100 px-4 dark:border-slate-900">
                                    <div className="flex gap-1.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                                        <div className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                                        <div className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                                    </div>
                                </div>
                                <div className="aspect-[16/9] overflow-hidden">
                                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0d0d0d] dark:to-[#151515]">
                                        <div className="flex flex-col items-center gap-4">
                                            <BookOpen className="h-20 w-20 text-primary opacity-20" />
                                            <p className="text-sm font-medium text-slate-400">معاينة واجهة القارئ الذكي</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Features Grid */}
                <section id="features" className="py-24">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="group rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Sun className="h-6 w-6" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">تزامن المظهر</h3>
                            <p className="text-muted-foreground">التطبيق يدعم الوضع الفاتح والداكن وتزامن النظام تلقائياً لتوفير أفضل تجربة قراءة.</p>
                        </div>
                        <div className="group rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <Church className="h-6 w-6" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">القطمارس اليومي</h3>
                            <p className="text-muted-foreground">قراءات يومية متكاملة تشمل البولس، الكاثوليكون، الإبركسيس، والسنكسار.</p>
                        </div>
                        <div className="group rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                <Heart className="h-6 w-6" />
                            </div>
                            <h3 className="mb-2 text-xl font-bold">بني بمحبة</h3>
                            <p className="text-muted-foreground">تطبيق مجاني ومفتوح المصدر لخدمة الكنيسة، تم تطويره بآخر التقنيات البرمجية.</p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="mt-auto border-t border-slate-100 py-12 text-center dark:border-slate-900">
                    <p className="text-sm text-slate-500">
                        © {new Date().getFullYear()} هوس إيروف. صنع بكل حب لخدمة الكنيسة القبطية الأرثوذكسية.
                    </p>
                </footer>
            </div>
        </div>
    );
}
