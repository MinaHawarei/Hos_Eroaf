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
    Monitor,
    Type,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Cookies from 'js-cookie';
import { GitHubSyncService, SyncProgress } from '@/services/GitHubSyncService';

type Bishop = {
    name: string;
    role: string; // مطران أو أسقف
    coRole: string; // أبيسكوبوس أو متروبوليتيس
};

type Props = {
    lastUpdated: string | null;
    appVersion: string;
    currentReadingsVersion: string | null;
    initialChurchData?: any; // البيانات المخزنة مسبقاً من السيرفر
    patronsList?: string[];
};

export default function Settings({
    lastUpdated,
    appVersion,
    currentReadingsVersion,
    initialChurchData,
    patronsList = [],
}: Props) {
    const { appearance, updateAppearance } = useAppearance();
    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updateResult, setUpdateResult] = useState<'none' | 'available' | 'error' | 'syncing' | 'completed' | null>(null);
    const [syncProgress, setSyncProgress] = useState<SyncProgress>({ total: 0, current: 0, currentFile: '', status: 'checking' });
    const [localVersionInfo, setLocalVersionInfo] = useState<{version: string, last_updated: string} | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('app_content_version');
        if (stored) {
            setLocalVersionInfo(JSON.parse(stored));
        }
    }, []);

    // Inertia Form لبيانات الكنيسة والخدمة
    const { data, setData, post, processing, recentlySuccessful } = useForm({
        patron: initialChurchData?.patron || 'العذراء مريم',
        popename: initialChurchData?.popename || 'تواضروس الثاني',
        diocesan_bishop: initialChurchData?.diocesan_bishop || {
            name: '',
            role: 'أسقف',
            coRole: 'أبيسكوبوس',
        },
        hasVisitingBishops: initialChurchData?.visiting_bishops?.length > 0 || false,
        visiting_bishops: initialChurchData?.visiting_bishops || ([] as Bishop[]),
        baseFontSize: Number(Cookies.get('baseFontSize')) || 28
    });

    const getCoRole = (role: string) => {
        if (role === 'مطران') return 'متروبوليتيس';
        if (role === 'أسقف') return 'أبيسكوبوس';
        return 'أبيسكوبوس';
    };

    const handleDiocesanRoleChange = (role: string) => {
        setData('diocesan_bishop', {
            ...data.diocesan_bishop,
            role,
            coRole: getCoRole(role),
        });
    };

    const handleSaveChurchData = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Save to js-cookie for immediate UI availability
        const dataToSave = {
            patron: data.patron,
            popename: data.popename,
            diocesan_bishop: data.diocesan_bishop,
            visiting_bishops: data.hasVisitingBishops ? data.visiting_bishops : [],
        };
        
        Cookies.set('church_settings', JSON.stringify(dataToSave), { expires: 365, path: '/' });
        Cookies.set('baseFontSize', data.baseFontSize.toString(), { expires: 365, path: '/' });

        // Update the useForm data in case we toggled off visiting bishops so it sends an empty array
        setData('visiting_bishops', dataToSave.visiting_bishops);

        post(route('settings.update-church'), {
            preserveScroll: true,
        });
    };

    const addVisitingBishop = () => {
        setData('visiting_bishops', [...data.visiting_bishops, { name: '', role: 'أسقف', coRole: 'أبيسكوبوس' }]);
    };

    const removeVisitingBishop = (index: number) => {
        const newBishops = data.visiting_bishops.filter((_: any, i: number) => i !== index);
        setData('visiting_bishops', newBishops);
    };

    const updateVisitingBishop = (index: number, field: keyof Bishop, value: string) => {
        const newBishops = [...data.visiting_bishops];
        newBishops[index] = { ...newBishops[index], [field]: value };
        if (field === 'role') {
            newBishops[index].coRole = getCoRole(value);
        }
        setData('visiting_bishops', newBishops);
    };

    const checkForUpdates = async () => {
        setCheckingUpdates(true);
        setUpdateResult(null);
        try {
            const syncService = new GitHubSyncService();
            
            syncService.onProgress = (progress) => {
                if (progress.status === 'downloading') {
                    setUpdateResult('syncing');
                    setSyncProgress(progress);
                }
            };

            const hasUpdates = await syncService.checkForUpdates();
            
            if (!hasUpdates) {
                setUpdateResult('none');
                setCheckingUpdates(false);
                return;
            }

            setUpdateResult('syncing');

            const updatedVersion = await syncService.performSync();
            setLocalVersionInfo(updatedVersion);
            setUpdateResult('completed');

        } catch (error) {
            console.error('Update failed:', error);
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
                        بيانات الكنيسة والآباء
                    </h2>

                    <form onSubmit={handleSaveChurchData} className="space-y-4">
                        {/* Church Patron */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">شفيع الكنيسة</label>
                            <div className="relative">
                                <select
                                    value={data.patron}
                                    onChange={e => setData('patron', e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                >
                                    {patronsList.map(patron => (
                                        <option key={patron} value={patron}>{patron}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

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

                        {/* Diocesan Bishop */}
                        <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
                            <h3 className="text-sm font-bold text-foreground">أسقف الإيبارشية / رئيس الدير</h3>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">الرتبة</label>
                                    <select
                                        value={data.diocesan_bishop.role}
                                        onChange={e => handleDiocesanRoleChange(e.target.value)}
                                        className="w-full rounded-lg bg-background p-2 text-sm border border-border outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="أسقف">أسقف</option>
                                        <option value="مطران">مطران</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">اللقب الكنسي</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={data.diocesan_bishop.coRole}
                                        className="w-full rounded-lg bg-muted/50 p-2 text-sm border border-border outline-none opacity-80 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">اسم الأب</label>
                                <input
                                    type="text"
                                    value={data.diocesan_bishop.name}
                                    onChange={e => setData('diocesan_bishop', { ...data.diocesan_bishop, name: e.target.value })}
                                    className="w-full rounded-lg bg-background p-2.5 text-sm border border-border outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="مثال: مينا"
                                />
                            </div>
                        </div>

                        {/* Visiting Bishops Toggle */}
                        <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3 border border-border/50">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">الأساقفة الحاضرون (ضيوف)</span>
                                <span className="text-xs text-muted-foreground">تفعيل لإضافة آباء آخرين حاضرين</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setData('hasVisitingBishops', !data.hasVisitingBishops)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${data.hasVisitingBishops ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data.hasVisitingBishops ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Visiting Bishops List */}
                        {data.hasVisitingBishops && (
                            <div className="space-y-4 pt-2">
                                {data.visiting_bishops.map((bishop: Bishop, index: number) => (
                                    <div key={index} className="relative space-y-3 rounded-xl border border-dashed border-border p-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">الرتبة</label>
                                                <select
                                                    value={bishop.role}
                                                    onChange={e => updateVisitingBishop(index, 'role', e.target.value)}
                                                    className="w-full rounded-lg bg-background p-2 text-sm border border-border outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="أسقف">أسقف</option>
                                                    <option value="مطران">مطران</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">اللقب الكنسي</label>
                                                <input
                                                    type="text"
                                                    disabled
                                                    value={bishop.coRole}
                                                    className="w-full rounded-lg bg-muted/50 p-2 text-sm border border-border outline-none opacity-80 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">اسم الأب الضيف</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={bishop.name}
                                                    onChange={e => updateVisitingBishop(index, 'name', e.target.value)}
                                                    className="flex-1 rounded-lg bg-background p-2 text-sm border border-border outline-none focus:ring-1 focus:ring-primary"
                                                    placeholder="الاسم"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeVisitingBishop(index)}
                                                    className="flex items-center justify-center rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 dark:bg-red-950/30"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addVisitingBishop}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    إضافة أب ضيف
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full rounded-xl py-3 text-sm font-bold text-primary-foreground shadow-md transition-all ${recentlySuccessful ? 'bg-emerald-600' : 'bg-primary hover:opacity-90 active:scale-[0.98]'}`}
                        >
                            {processing ? 'جاري الحفظ...' : recentlySuccessful ? 'تم الحفظ بنجاح ✓' : 'حفظ إعدادات الكنيسة'}
                        </button>
                    </form>
                </section>

                {/* Display & Presentation Settings Section */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Monitor className="h-4.5 w-4.5 text-primary" />
                        إعدادات العرض
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <Type className="h-4 w-4 text-muted-foreground" />
                                    حجم الخط الأساسي للعرض
                                </label>
                                <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                                    {data.baseFontSize}px
                                </span>
                            </div>
                            
                            <input
                                type="range"
                                min="20"
                                max="80"
                                step="2"
                                value={data.baseFontSize}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setData('baseFontSize', val);
                                    Cookies.set('baseFontSize', val.toString(), { expires: 365, path: '/' });
                                }}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>صغير (20)</span>
                                <span>كبير (80)</span>
                            </div>

                            <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 text-center" style={{ fontSize: `${data.baseFontSize}px` }}>
                                تجربة حجم النص الأساسي
                            </div>
                        </div>
                    </div>
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
                                {localVersionInfo?.last_updated || lastUpdated || 'لم يتم التحديث بعد'}
                            </span>
                        </div>

                        {(localVersionInfo?.version || currentReadingsVersion) && (
                            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <BookOpen className="h-4 w-4" />
                                    <span>إصدار القراءات:</span>
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    {localVersionInfo?.version || currentReadingsVersion}
                                </span>
                            </div>
                        )}

                        <button
                            onClick={checkForUpdates}
                            disabled={checkingUpdates || updateResult === 'syncing'}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
                        >
                            <RefreshCw className={`h-4 w-4 ${checkingUpdates || updateResult === 'syncing' ? 'animate-spin' : ''}`} />
                            {updateResult === 'syncing' ? 'جاري التزامن...' : checkingUpdates ? 'جاري التحقق...' : 'التحقق من التحديثات'}
                        </button>

                        {updateResult === 'syncing' && (
                            <div className="space-y-2 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                        جاري تحديث الملفات... ({syncProgress.current} من {syncProgress.total})
                                    </span>
                                    <span className="text-xs text-blue-600/70 dark:text-blue-400/70">
                                        {Math.round((syncProgress.current / (syncProgress.total || 1)) * 100)}%
                                    </span>
                                </div>
                                <div className="w-full bg-blue-200 dark:bg-blue-900/40 rounded-full h-1.5 mt-2">
                                    <div 
                                        className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                                        style={{ width: `${(syncProgress.current / (syncProgress.total || 1)) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-blue-500 truncate mt-1 text-left ltr" dir="ltr">
                                    {syncProgress.currentFile}
                                </p>
                            </div>
                        )}

                        {updateResult === 'completed' && (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">تم التحديث بنجاح إلى إصدار {localVersionInfo?.version}</span>
                            </div>
                        )}

                        {updateResult === 'none' && (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">لا توجد تحديثات جديدة</span>
                            </div>
                        )}

                        {updateResult === 'error' && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm font-medium text-red-700 dark:text-red-400">حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة.</span>
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
