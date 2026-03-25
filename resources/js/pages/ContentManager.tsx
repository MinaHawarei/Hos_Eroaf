import React, { useState, useEffect, useCallback } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import {
    FileJson, ChevronRight, Save, Undo2, Plus, Trash2, Code,
    LayoutList, FileText, Music, ChevronDown, Search, X,
    FilePlus, AlertTriangle, LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditingState {
    category: string;
    filename: string;
    content: any;
}

interface ManagerProps {
    files: Record<string, string[]>;
    editing?: EditingState;
}

type Category = 'liturgy' | 'readings' | 'lectionary' | 'lyrics' | 'hymns';

const CATEGORY_TEMPLATES: Record<Category, any> = {
    liturgy: { code: '', title: '', style: 1, content: [] },
    readings: {
        Day: '', style: 1,
        vespers_psalm: [], vespers_gospel: [],
        matins_psalm: [], matins_gospel: [],
        pauline: [], catholic: [], praxis: [],
        synaxarium: [], liturgy_psalm: [], liturgy_gospel: [],
    },
    lectionary: {
        Day: '', style: 1,
        vespers_psalm: [], vespers_gospel: [],
        matins_psalm: [], matins_gospel: [],
        pauline: [], catholic: [], praxis: [],
        synaxarium: [], liturgy_psalm: [], liturgy_gospel: [],
    },
    lyrics: { title: '', lyrics: [] },
    hymns: { title: '', lyrics: [] },
};

const READINGS_TABS = [
    { id: 'vespers_psalm',  label: 'مزمور عشية' },
    { id: 'vespers_gospel', label: 'إنجيل عشية' },
    { id: 'matins_psalm',   label: 'مزمور باكر' },
    { id: 'matins_gospel',  label: 'إنجيل باكر' },
    { id: 'pauline',        label: 'البولس' },
    { id: 'catholic',       label: 'الكاثوليكون' },
    { id: 'praxis',         label: 'الابركسيس' },
    { id: 'synaxarium',     label: 'السنكسار' },
    { id: 'liturgy_psalm',  label: 'مزمور القداس' },
    { id: 'liturgy_gospel', label: 'إنجيل القداس' },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function arrToText(arr: string[] | undefined): string {
    return Array.isArray(arr) ? arr.join('\n') : '';
}
function textToArr(text: string): string[] {
    return text.split('\n');
}

// ─── Sub-forms ────────────────────────────────────────────────────────────────

function LiturgyForm({ content, onChange }: { content: any; onChange: (c: any) => void }) {
    if (!content) return null;
    const blocks: any[] = Array.isArray(content.content) ? content.content : [];

    const setTop = (key: string, val: any) => onChange({ ...content, [key]: val });

    const setBlock = (idx: number, key: string, val: any) => {
        const next = [...blocks];
        next[idx] = { ...next[idx], [key]: val };
        onChange({ ...content, content: next });
    };

    const addBlock = () => {
        onChange({ ...content, content: [...blocks, { speaker: '', text_ar: [], text_ar_co: [], text_co: [] }] });
    };

    const removeBlock = (idx: number) => {
        const next = [...blocks];
        next.splice(idx, 1);
        onChange({ ...content, content: next });
    };

    return (
        <div className="space-y-6">
            {/* Top-level meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-muted/30 rounded-2xl border border-border/10">
                <div>
                    <label className="label-xs">العنوان</label>
                    <input className="field-input !bg-white text-black" dir="rtl" value={content.title || ''} onChange={e => setTop('title', e.target.value)} />
                </div>
                <div>
                    <label className="label-xs">الكود الداخلي</label>
                    <input className="field-input !bg-white text-black" value={content.code || ''} onChange={e => setTop('code', e.target.value)} />
                </div>
                <div>
                    <label className="label-xs">Style</label>
                    <input className="field-input !bg-white text-black" type="number" value={content.style ?? 1} onChange={e => setTop('style', Number(e.target.value))} />
                </div>
            </div>

            {/* Blocks */}
            <div className="space-y-4">
                {blocks.map((block: any, idx: number) => (
                    <div key={idx} className="relative p-5 bg-muted/20 rounded-2xl border border-border/10 group">
                        <button
                            type="button"
                            onClick={() => removeBlock(idx)}
                            className="absolute -top-2.5  h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                        >
                            <X className="h-3 w-3" />
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                #{idx + 1}
                            </span>
                            <select
                                className="field-input !bg-white text-black flex-1"
                                dir="rtl"
                                value={block.speaker || ''}
                                onChange={e => setBlock(idx, 'speaker', e.target.value)}
                            >
                                <option value="">— اختر المتحدث —</option>
                                <option value="الشعب">الشعب</option>
                                <option value="الكاهن">الكاهن</option>
                                <option value="الشماس">الشماس</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="label-xs">النص العربي</label>
                                <textarea
                                    className="field-textarea h-36 !bg-white text-black"
                                    dir="rtl"
                                    value={arrToText(block.text_ar)}
                                    onChange={e => setBlock(idx, 'text_ar', textToArr(e.target.value))}
                                    placeholder="سطر لكل نص..."
                                />
                            </div>
                            <div>
                                <label className="label-xs">النص القبطي المعرّب</label>
                                <textarea
                                    className="field-textarea h-36 !bg-white text-black"
                                    dir="rtl"
                                    value={arrToText(block.text_ar_co)}
                                    onChange={e => setBlock(idx, 'text_ar_co', textToArr(e.target.value))}
                                    placeholder="سطر لكل نص..."
                                />
                            </div>
                            <div>
                                <label className="label-xs">النص القبطي</label>
                                <textarea
                                    className="field-textarea h-36 !bg-white text-black"
                                    value={arrToText(block.text_co)}
                                    onChange={e => setBlock(idx, 'text_co', textToArr(e.target.value))}
                                    placeholder="Coptic script..."
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addBlock}
                className="w-full py-5 border-2 border-dashed border-border/30 rounded-2xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="h-4 w-4" />
                إضافة فقرة جديدة
            </button>
        </div>
    );
}

function ReadingsForm({ content, onChange }: { content: any; onChange: (c: any) => void }) {
    const [activeTab, setActiveTab] = useState(READINGS_TABS[0].id);
    if (!content) return null;

    const setTop = (key: string, val: any) => onChange({ ...content, [key]: val });

    const readings: any[] = Array.isArray(content[activeTab]) ? content[activeTab] : [];

    const setReading = (rIdx: number, key: string, val: any) => {
        const next = [...readings];
        next[rIdx] = { ...next[rIdx], [key]: val };
        onChange({ ...content, [activeTab]: next });
    };

    const addReading = () => {
        const next = [...readings, { title_ar: '', intonation_ar: '', intonation_co: '', text_ar: [], text_ar_co: [] }];
        onChange({ ...content, [activeTab]: next });
    };

    const removeReading = (rIdx: number) => {
        const next = [...readings];
        next.splice(rIdx, 1);
        onChange({ ...content, [activeTab]: next });
    };

    return (
        <div className="space-y-5">
            {/* Top meta */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-border/10">
                <div>
                    <label className="label-xs">اليوم</label>
                    <input className="field-input !bg-white text-black" dir="rtl" value={content.Day || ''} onChange={e => setTop('Day', e.target.value)} placeholder="مثال: 2 توت" />
                </div>
                <div>
                    <label className="label-xs">Style</label>
                    <input className="field-input !bg-white text-black" type="number" value={content.style ?? 1} onChange={e => setTop('style', Number(e.target.value))} />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-5">
                {/* Section tabs */}
                <div className="md:w-52 flex-shrink-0 space-y-1">
                    {READINGS_TABS.map(tab => {
                        const count = Array.isArray(content[tab.id]) ? content[tab.id].length : 0;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'w-full text-right px-4 py-2 rounded-xl text-sm transition-all flex items-center justify-between gap-2',
                                    activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                                        : 'hover:bg-muted text-muted-foreground'
                                )}
                                dir="rtl"
                            >
                                <span>{tab.label}</span>
                                {count > 0 && (
                                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-mono',
                                        activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    )}>{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Reading cards */}
                <div className="flex-1 space-y-4">
                    {readings.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-border/20 rounded-2xl text-muted-foreground text-sm">
                            لا توجد قراءات لهذا القسم
                        </div>
                    )}
                    {readings.map((r: any, rIdx: number) => (
                        <div key={rIdx} className="relative p-5 bg-muted/20 rounded-2xl border border-border/10 group space-y-4">
                            <button
                                type="button"
                                onClick={() => removeReading(rIdx)}
                                className="absolute -top-2.5 -left-2.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                                <X className="h-3 w-3" />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-3">
                                    <label className="label-xs">العنوان</label>
                                    <input className="field-input !bg-white text-black" dir="rtl" value={r.title_ar || ''} onChange={e => setReading(rIdx, 'title_ar', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-xs">اللحن (عربي)</label>
                                    <input className="field-input !bg-white text-black" dir="rtl" value={r.intonation_ar || ''} onChange={e => setReading(rIdx, 'intonation_ar', e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label-xs">اللحن (قبطي)</label>
                                    <input className="field-input !bg-white text-black" dir="rtl" value={r.intonation_co || ''} onChange={e => setReading(rIdx, 'intonation_co', e.target.value)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-xs">النص العربي</label>
                                    <textarea
                                        className="field-textarea h-40"
                                        dir="rtl"
                                        value={arrToText(r.text_ar)}
                                        onChange={e => setReading(rIdx, 'text_ar', textToArr(e.target.value))}
                                        placeholder="سطر لكل جملة..."
                                    />
                                </div>
                                <div>
                                    <label className="label-xs">النص القبطي المعرّب</label>
                                    <textarea
                                        className="field-textarea h-40"
                                        dir="rtl"
                                        value={arrToText(r.text_ar_co)}
                                        onChange={e => setReading(rIdx, 'text_ar_co', textToArr(e.target.value))}
                                        placeholder="سطر لكل جملة..."
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addReading}
                        className="w-full py-4 border-2 border-dashed border-border/30 rounded-2xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        إضافة قراءة
                    </button>
                </div>
            </div>
        </div>
    );
}

function LyricsForm({ content, onChange }: { content: any; onChange: (c: any) => void }) {
    if (!content) return null;
    const lines: string[] = Array.isArray(content.lyrics) ? content.lyrics : [];

    const setLine = (idx: number, val: string) => {
        const next = [...lines];
        next[idx] = val;
        onChange({ ...content, lyrics: next });
    };

    const addLine = () => onChange({ ...content, lyrics: [...lines, ''] });

    const removeLine = (idx: number) => {
        const next = [...lines];
        next.splice(idx, 1);
        onChange({ ...content, lyrics: next });
    };

    return (
        <div className="space-y-5">
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/10">
                <label className="label-xs">العنوان</label>
                <input
                    className="field-input !bg-white text-black"
                    dir="rtl"
                    value={content.title || ''}
                    onChange={e => onChange({ ...content, title: e.target.value })}
                />
            </div>

            <div className="p-5 bg-muted/20 rounded-2xl border border-border/10 space-y-2">
                <label className="label-xs mb-3 block">كلمات الترنيمة</label>
                {lines.map((line: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 group">
                        <span className="text-[10px] text-muted-foreground w-5 text-right flex-shrink-0 font-mono">{idx + 1}</span>
                        <input
                            type="text"
                            className="field-input !bg-white text-black flex-1"
                            value={line}
                            dir="rtl"
                            onChange={e => setLine(idx, e.target.value)}
                            placeholder="سطر..."
                        />
                        <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addLine}
                    className="mt-3 w-full py-3 border-2 border-dashed border-border/30 rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    إضافة سطر
                </button>
            </div>
        </div>
    );
}

// ─── New File Modal ───────────────────────────────────────────────────────────

function NewFileModal({ onClose }: { onClose: () => void }) {
    const [category, setCategory] = useState<Category>('liturgy');
    const [filename, setFilename] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = () => {
        const trimmed = filename.trim();
        if (!trimmed) { setError('اسم الملف مطلوب'); return; }
        setError('');
        setLoading(true);

        const finalName = trimmed.endsWith('.json') ? trimmed : trimmed + '.json';

        router.post(
            route('content.store'),
            { category, filename: finalName, content: CATEGORY_TEMPLATES[category] },
            {
                onError: (errs) => { setError(errs.filename || 'حدث خطأ'); setLoading(false); },
                onFinish: () => setLoading(false),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-background border border-border/20 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black">ملف جديد</h2>
                    <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="label-xs">التصنيف</label>
                        <select
                            className="field-input !bg-white text-black"
                            value={category}
                            onChange={e => setCategory(e.target.value as Category)}
                        >
                            <option value="liturgy">liturgy — قداسات</option>
                            <option value="readings">readings — قراءات</option>
                            <option value="lectionary">lectionary — قطمارس</option>
                            <option value="lyrics">lyrics — كلمات</option>
                            <option value="hymns">hymns — تسابيح</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-xs">اسم الملف</label>
                        <input
                            className={cn('field-input !bg-white text-black', error && 'border-destructive ring-1 ring-destructive')}
                            placeholder="اسم الملف (بدون .json)"
                            value={filename}
                            onChange={e => setFilename(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            autoFocus
                        />
                        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1">إلغاء</Button>
                    <Button type="button" onClick={handleCreate} disabled={loading} className="flex-1 rounded-full shadow-lg shadow-primary/20">
                        {loading ? 'جاري الإنشاء...' : (
                            <><FilePlus className="h-4 w-4 mr-2" />إنشاء</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ category, filename, onClose }: { category: string; filename: string; onClose: () => void }) {
    const [loading, setLoading] = useState(false);

    const handleDelete = () => {
        setLoading(true);
        router.delete(route('content.destroy'), {
            data: { category, filename },
            onFinish: () => { setLoading(false); onClose(); },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-background border border-border/20 rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-5 text-center"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-7 w-7 text-destructive" />
                    </div>
                    <h2 className="text-xl font-black">حذف الملف؟</h2>
                    <p className="text-sm text-muted-foreground">
                        سيتم حذف <span className="font-bold text-foreground">{filename}</span> نهائياً ولا يمكن التراجع.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button type="button" variant="ghost" onClick={onClose} className="flex-1">إلغاء</Button>
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} className="flex-1 rounded-full">
                        {loading ? 'جاري الحذف...' : 'حذف'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContentManager({ files, editing }: ManagerProps) {
    const [viewMode, setViewMode] = useState<'form' | 'raw'>('form');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(editing?.category || null);
    const [showNewModal, setShowNewModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ category: string; filename: string } | null>(null);

    const { data, setData, post, processing, reset, wasSuccessful } = useForm({
        category: editing?.category || '',
        filename: editing?.filename || '',
        content: editing?.content || null,
    });

    useEffect(() => {
        if (editing) {
            setData({ category: editing.category, filename: editing.filename, content: editing.content });
            setViewMode('form');
        }
    }, [editing]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('content.update'), { preserveScroll: true });
    };

    const loadFile = (category: string, filename: string) => {
        router.visit(route('content.show', { category, filename }), { preserveScroll: true });
    };

    const handleContentChange = useCallback((newContent: any) => {
        setData('content', newContent);
    }, []);

    const catIcon = (cat: string) => {
        if (cat === 'liturgy') return <LayoutList className="h-3.5 w-3.5" />;
        if (cat === 'lyrics' || cat === 'hymns') return <Music className="h-3.5 w-3.5" />;
        return <FileText className="h-3.5 w-3.5" />;
    };

    return (
        <>
            {/* Utility CSS injected in head via style tag */}
            <style>{`
                .label-xs { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: hsl(var(--muted-foreground)); margin-bottom: 5px; }
                .field-input !bg-white text-black { width: 100%; background: hsl(var(--background)); border: 1px solid hsl(var(--border) / 0.3); border-radius: 8px; padding: 6px 10px; font-size: 14px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
                .field-input !bg-white text-black:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15); }
                .field-textarea { width: 100%; background: hsl(var(--background)); border: 1px solid hsl(var(--border) / 0.3); border-radius: 8px; padding: 8px 10px; font-size: 14px; line-height: 1.7; outline: none; resize: vertical; transition: border-color 0.15s, box-shadow 0.15s; font-family: inherit; }
                .field-textarea:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15); }
            `}</style>

            <div className="min-h-screen bg-background text-foreground font-sans" dir="ltr">
                <Head title="Content Manager" />

                <div className="max-w-[1700px] mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 h-screen overflow-hidden">

                    {/* ── Sidebar ── */}
                    <aside className="w-full md:w-72 flex-shrink-0">
                        <div className="heritage-surface p-5 rounded-2xl h-full flex flex-col gap-4 overflow-hidden">
                            <div className="flex items-center justify-between flex-shrink-0">
                                <h2 className="text-base font-black flex items-center gap-2">
                                    <FileJson className="h-4 w-4 text-primary" />
                                    Explorer
                                </h2>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 rounded-full text-xs px-3 shadow-sm shadow-primary/20"
                                    onClick={() => setShowNewModal(true)}
                                >
                                    <FilePlus className="h-3.5 w-3.5 mr-1.5" />
                                    جديد
                                </Button>
                            </div>

                            <div className="relative flex-shrink-0">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    className="w-full bg-muted/30 pl-8 pr-3 py-2 rounded-xl text-xs border-none outline-none focus:ring-1 focus:ring-primary"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {(['liturgy', 'lectionary', 'readings', 'hymns', 'lyrics'] as const).map(cat => {
                                    const catFiles = (files[cat] || []).filter(f =>
                                        f.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    const isOpen = selectedCategory === cat || editing?.category === cat;

                                    return (
                                        <div key={cat}>
                                            <button
                                                type="button"
                                                className={cn(
                                                    'w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-lg transition-colors',
                                                    isOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                                )}
                                                onClick={() => setSelectedCategory(isOpen ? null : cat)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {catIcon(cat)}
                                                    <span>{cat}</span>
                                                    <span className="text-[9px] opacity-50 font-normal normal-case">({(files[cat] || []).length})</span>
                                                </div>
                                                <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen ? 'rotate-180' : '')} />
                                            </button>

                                            {isOpen && (
                                                <div className="ml-3 pl-2 border-l border-primary/10 py-0.5 flex flex-col gap-0.5">
                                                    {catFiles.length === 0 && (
                                                        <span className="text-[11px] text-muted-foreground/50 px-3 py-1 italic">لا توجد ملفات</span>
                                                    )}
                                                    {catFiles.map(file => (
                                                        <div key={file} className="flex items-center group/item">
                                                            <button
                                                                type="button"
                                                                onClick={() => loadFile(cat, file)}
                                                                className={cn(
                                                                    'flex-1 text-[12px] px-3 py-1.5 rounded-lg text-left transition-all truncate',
                                                                    editing?.filename === file && editing?.category === cat
                                                                        ? 'bg-primary/15 text-primary font-bold'
                                                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                                                )}
                                                            >
                                                                {file}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteTarget({ category: cat, filename: file })}
                                                                className="h-6 w-6 flex items-center justify-center text-muted-foreground/30 hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-all flex-shrink-0 mr-1"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    {/* ── Main Workspace ── */}
                    <main className="flex-1 min-w-0 overflow-y-auto">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-5 overflow-x-auto whitespace-nowrap">
                            <button type="button" onClick={() => router.visit(route('content.index'))} className="hover:text-primary flex items-center gap-1.5">
                                <LayoutDashboard className="h-3.5 w-3.5" />
                                <span>Content</span>
                            </button>
                            {editing && (
                                <>
                                    <ChevronRight className="h-3 w-3 opacity-40" />
                                    <span className="capitalize">{editing.category}</span>
                                    <ChevronRight className="h-3 w-3 opacity-40" />
                                    <span className="font-bold text-foreground">{editing.filename}</span>
                                </>
                            )}
                        </nav>

                        {!editing ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center border-2 border-dashed border-border/10 rounded-3xl opacity-30">
                                <FileJson className="h-20 w-20 mb-4 text-muted-foreground/30" />
                                <h3 className="text-xl font-serif">اختر ملفاً للبدء</h3>
                                <p className="text-sm mt-2 text-muted-foreground">إدارة القداسات والقراءات والتسابيح</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-6 pb-32">
                                {/* Toolbar */}
                                <div className="flex items-center justify-between gap-4 sticky top-0 z-20 bg-background/90 backdrop-blur-md py-3 border-b border-border/10">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <h1 className="text-xl font-black truncate">{data.filename.replace('.json', '')}</h1>
                                        <div className="flex bg-muted rounded-full p-1 flex-shrink-0">
                                            <button
                                                type="button"
                                                className={cn('px-3 py-1 text-xs rounded-full transition-all', viewMode === 'form' ? 'bg-background shadow font-bold' : 'text-muted-foreground')}
                                                onClick={() => setViewMode('form')}
                                            >
                                                Interface
                                            </button>
                                            <button
                                                type="button"
                                                className={cn('px-3 py-1 text-xs rounded-full transition-all', viewMode === 'raw' ? 'bg-background shadow font-bold' : 'text-muted-foreground')}
                                                onClick={() => setViewMode('raw')}
                                            >
                                                JSON
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => reset()} disabled={!editing}>
                                            <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                                            تراجع
                                        </Button>
                                        <Button type="submit" disabled={processing} className="px-6 rounded-full shadow-lg shadow-primary/20 text-sm">
                                            {processing ? 'جاري الحفظ...' : <><Save className="h-3.5 w-3.5 mr-1.5" />حفظ</>}
                                        </Button>
                                    </div>
                                </div>

                                {/* Editor */}
                                {viewMode === 'raw' ? (
                                    <div className="rounded-2xl overflow-hidden border border-border/10">
                                        <div className="px-4 py-2 bg-muted/50 border-b border-border/10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <Code className="h-3 w-3" />
                                            Raw JSON Editor
                                        </div>
                                        <textarea
                                            className="w-full bg-[#0d1117] p-6 font-mono text-sm leading-relaxed text-green-400 min-h-[600px] outline-none"
                                            value={JSON.stringify(data.content, null, 4)}
                                            onChange={e => {
                                                try { setData('content', JSON.parse(e.target.value)); } catch {}
                                            }}
                                            dir="ltr"
                                            spellCheck={false}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {data.category === 'liturgy' && (
                                            <LiturgyForm content={data.content} onChange={handleContentChange} />
                                        )}
                                        {(data.category === 'readings' || data.category === 'lectionary') && (
                                            <ReadingsForm content={data.content} onChange={handleContentChange} />
                                        )}
                                        {(data.category === 'lyrics' || data.category === 'hymns') && (
                                            <LyricsForm content={data.content} onChange={handleContentChange} />
                                        )}
                                        {!['liturgy', 'readings', 'lectionary', 'lyrics', 'hymns'].includes(data.category) && (
                                            <div className="text-center p-16 bg-muted/20 rounded-3xl border-2 border-dashed border-border/10 text-muted-foreground text-sm">
                                                هذا التصنيف لا يملك واجهة مخصصة. استخدم وضع JSON.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        )}
                    </main>
                </div>

                {/* Success toast */}
                {wasSuccessful && (
                    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                        <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
                            <Save className="h-4 w-4" />
                            <span className="font-bold text-sm">تم الحفظ بنجاح</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showNewModal && <NewFileModal onClose={() => setShowNewModal(false)} />}
            {deleteTarget && (
                <DeleteModal
                    category={deleteTarget.category}
                    filename={deleteTarget.filename}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </>
    );
}
