import HosLayout from '@/layouts/HosLayout';
import { useAppearance } from '@/composables/useAppearance';
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    Clock,
    Download,
    Info,
    RefreshCw,
    Settings as SettingsIcon,
    Volume2,
} from 'lucide-react';
import { useState } from 'react';

type Props = {
    lastUpdated: string | null;
    appVersion: string;
    currentReadingsVersion: string | null;
};

export default function Settings({
    lastUpdated,
    appVersion,
    currentReadingsVersion,
}: Props) {
    const { appearance, updateAppearance } = useAppearance();
    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updateResult, setUpdateResult] = useState<'none' | 'available' | 'error' | null>(null);

    const checkForUpdates = async () => {
        setCheckingUpdates(true);
        setUpdateResult(null);

        try {
            // MVP: Mock check — in production calls /api/updates/check
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setUpdateResult('none');
        } catch {
            setUpdateResult('error');
        } finally {
            setCheckingUpdates(false);
        }
    };

    return (
        <HosLayout
            title="الإعدادات"
            breadcrumbs={[
                { label: 'الرئيسية', href: '/' },
                { label: 'الإعدادات' },
            ]}
        >
            <div className="mx-auto max-w-2xl space-y-6">
                {/* Page Title */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <SettingsIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">الإعدادات</h1>
                        <p className="text-sm text-muted-foreground">إدارة التطبيق والتحديثات</p>
                    </div>
                </div>

                {/* Content Updates Section */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Download className="h-4.5 w-4.5 text-primary" />
                        تحديث المحتوى
                    </h2>

                    <div className="space-y-4">
                        {/* Last Updated */}
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>آخر تحديث:</span>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                                {lastUpdated || 'لم يتم التحديث بعد'}
                            </span>
                        </div>

                        {/* Current Version --> */}
                        {currentReadingsVersion && (
                            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <BookOpen className="h-4 w-4" />
                                    <span>إصدار القراءات:</span>
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    {currentReadingsVersion}
                                </span>
                            </div>
                        )}

                        {/* Check for Updates */}
                        <button
                            onClick={checkForUpdates}
                            disabled={checkingUpdates}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${checkingUpdates ? 'animate-spin' : ''}`}
                            />
                            {checkingUpdates ? 'جاري التحقق...' : 'التحقق من التحديثات'}
                        </button>

                        {/* Update Result */}
                        {updateResult === 'none' && (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    لا توجد تحديثات جديدة
                                </span>
                            </div>
                        )}
                        {updateResult === 'error' && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                                    فشل التحقق — تأكد من اتصالك بالإنترنت
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Audio Settings */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Volume2 className="h-4.5 w-4.5 text-primary" />
                        إعدادات الاستماع
                    </h2>

                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            سيتم إضافة المزيد من خيارات الصوت في التحديثات القادمة.
                        </p>
                    </div>
                </section>

                {/* About */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Info className="h-4.5 w-4.5 text-primary" />
                        عن التطبيق
                    </h2>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                            <span className="text-sm text-muted-foreground">الاسم</span>
                            <span className="text-sm font-semibold text-foreground">هوس إيروف</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                            <span className="text-sm text-muted-foreground">الإصدار</span>
                            <span className="text-sm font-medium text-foreground">{appVersion}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                            <span className="text-sm text-muted-foreground">الوصف</span>
                            <span className="text-sm text-foreground">
                                تطبيق القراءات الكنسية القبطية الأرثوذكسية
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </HosLayout>
    );
}
