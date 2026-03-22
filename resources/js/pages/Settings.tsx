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
    User,
    Plus,
    Trash2,
    ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from '@inertiajs/react';

type Bishop = {
    name: string;
    role: string; // مطران أو أسقف
    coRole: string; // أبيسكوبوس أو غيرها
};

type Props = {
    lastUpdated: string | null;
    appVersion: string;
    currentReadingsVersion: string | null;
    initialChurchData?: any; // البيانات المخزنة مسبقاً من السيرفر
};

export default function Settings({
    lastUpdated,
    appVersion,
    currentReadingsVersion,
    initialChurchData,
}: Props) {
    const { appearance, updateAppearance } = useAppearance();
    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updateResult, setUpdateResult] = useState<'none' | 'available' | 'error' | null>(null);

    // Inertia Form لبيانات الكنيسة والخدمة
    const { data, setData, post, processing, recentlySuccessful } = useForm({
        popename: initialChurchData?.popename || 'تواضروس الثاني',
        isBishopPresent: initialChurchData?.isBishopPresent || false,
        bishops: initialChurchData?.bishops || [{ name: '', role: 'أسقف', coRole: 'أبيسكوبوس' }] as Bishop[]
    });

    const handleSaveChurchData = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('settings.update-church'), {
            preserveScroll: true,
        });
    };

    const addBishop = () => {
        setData('bishops', [...data.bishops, { name: '', role: 'أسقف', coRole: 'أبيسكوبوس' }]);
    };

    const removeBishop = (index: number) => {
        const newBishops = data.bishops.filter((_, i) => i !== index);
        setData('bishops', newBishops);
    };

    const updateBishop = (index: number, field: keyof Bishop, value: string) => {
        const newBishops = [...data.bishops];
        newBishops[index] = { ...newBishops[index], [field]: value };
        setData('bishops', newBishops);
    };

    const checkForUpdates = async () => {
        setCheckingUpdates(true);
        setUpdateResult(null);
        try {
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
            <div className="mx-auto max-w-2xl space-y-6 pb-10">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <SettingsIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">الإعدادات</h1>
                        <p className="text-sm text-muted-foreground">تخصيص التطبيق وبيانات الطقس</p>
                    </div>
                </div>

                {/* Church & Clergy Data Section */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                        <User className="h-4.5 w-4.5 text-primary" />
                        بيانات الآباء والخدمة
                    </h2>

                    <form onSubmit={handleSaveChurchData} className="space-y-4">
                        {/* Pope Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">اسم البطريرك</label>
                            <input
                                type="text"
                                value={data.popename}
                                onChange={e => setData('popename', e.target.value)}
                                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="مثال: تواضروس الثاني"
                            />
                        </div>

                        {/* Bishop Presence Toggle */}
                        <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3 border border-border/50">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">حضور أسقف أو مطران</span>
                                <span className="text-xs text-muted-foreground">تفعيل هذا الخيار سيضيف أسماءهم للصلوات</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setData('isBishopPresent', !data.isBishopPresent)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.isBishopPresent ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.isBishopPresent ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Bishop List */}
                        {data.isBishopPresent && (
                            <div className="space-y-4 pt-2">
                                {data.bishops.map((bishop, index) => (
                                    <div key={index} className="relative space-y-3 rounded-xl border border-dashed border-border p-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">الرتبة</label>
                                                <select
                                                    value={bishop.role}
                                                    onChange={e => updateBishop(index, 'role', e.target.value)}
                                                    className="w-full rounded-lg bg-muted/50 p-2 text-sm border-none outline-none ring-1 ring-border"
                                                >
                                                    <option value="أسقف">أسقف</option>
                                                    <option value="مطران">مطران</option>
                                                    <option value="رئيس دير">رئيس دير</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">اللقب الكنسي</label>
                                                <select
                                                    value={bishop.coRole}
                                                    onChange={e => updateBishop(index, 'coRole', e.target.value)}
                                                    className="w-full rounded-lg bg-muted/50 p-2 text-sm border-none outline-none ring-1 ring-border"
                                                >
                                                    <option value="أبيسكوبوس">أبيسكوبوس</option>
                                                    <option value="متروبوليتيس">متروبوليتيس</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">اسم الأب</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={bishop.name}
                                                    onChange={e => updateBishop(index, 'name', e.target.value)}
                                                    className="flex-1 rounded-lg bg-muted/50 p-2 text-sm border-none outline-none ring-1 ring-border focus:ring-primary"
                                                    placeholder="مثال: مينا"
                                                />
                                                {data.bishops.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBishop(index)}
                                                        className="flex items-center justify-center rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 dark:bg-red-950/30"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addBishop}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    إضافة أب آخر
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full rounded-xl py-3 text-sm font-bold text-primary-foreground shadow-md transition-all ${recentlySuccessful ? 'bg-emerald-600' : 'bg-primary hover:opacity-90 active:scale-[0.98]'}`}
                        >
                            {processing ? 'جاري الحفظ...' : recentlySuccessful ? 'تم الحفظ بنجاح ✓' : 'حفظ إعدادات الخدمة'}
                        </button>
                    </form>
                </section>

                {/* Content Updates Section */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Download className="h-4.5 w-4.5 text-primary" />
                        تحديث المحتوى
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>آخر تحديث:</span>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                                {lastUpdated || 'لم يتم التحديث بعد'}
                            </span>
                        </div>

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

                        <button
                            onClick={checkForUpdates}
                            disabled={checkingUpdates}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
                        >
                            <RefreshCw className={`h-4 w-4 ${checkingUpdates ? 'animate-spin' : ''}`} />
                            {checkingUpdates ? 'جاري التحقق...' : 'التحقق من التحديثات'}
                        </button>

                        {updateResult === 'none' && (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">لا توجد تحديثات جديدة</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* About Section */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Info className="h-4.5 w-4.5 text-primary" />
                        عن التطبيق
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm">
                            <span className="text-muted-foreground">الاسم</span>
                            <span className="font-semibold">هوس إيروف</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm">
                            <span className="text-muted-foreground">الإصدار</span>
                            <span className="font-medium">{appVersion}</span>
                        </div>
                    </div>
                </section>
            </div>
        </HosLayout>
    );
}
