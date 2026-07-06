import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Loader2, BookOpen, Library } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SearchService } from '@/services/SearchService';
import { cn } from '@/lib/utils';

export type SearchMode = 'local' | 'global';

export interface GlobalSearchResult {
    source: string;
    file: string;
    label: string;
    slide: Record<string, unknown>;
}

const EMPTY_SLIDES: any[] = [];

function getSnippet(lines: any[], query: string): string | null {
    if (!lines || !Array.isArray(lines) || !query) return null;

    const matchingLine = lines.find((line: any) => {
        return line && line.text && SearchService.isMatch(query, line.text);
    });

    if (!matchingLine || !matchingLine.text) return null;

    const text: string = matchingLine.text;
    const words = text.split(/\s+/);

    let matchWordIdx = -1;
    for (let i = 0; i < words.length; i++) {
        if (SearchService.isMatch(query, words[i])) {
            matchWordIdx = i;
            break;
        }
    }

    if (matchWordIdx === -1) {
        for (let i = 0; i < words.length; i++) {
            const combined = words.slice(i, i + query.split(/\s+/).length).join(' ');
            if (SearchService.isMatch(query, combined)) {
                matchWordIdx = i;
                break;
            }
        }
    }

    if (matchWordIdx !== -1) {
        const queryWordCount = query.split(/\s+/).length;
        const start = Math.max(0, matchWordIdx - 2);
        const end = Math.min(words.length, matchWordIdx + queryWordCount + 2);

        const snippetWords = words.slice(start, end);
        let snippet = snippetWords.join(' ');

        if (start > 0) {
            snippet = '... ' + snippet;
        }
        if (end < words.length) {
            snippet = snippet + ' ...';
        }
        return snippet;
    }

    return text;
}

interface SearchOverlayProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Jump to an existing slide in the current deck (local mode). */
    onLocalResult?: (slideId: string, query: string) => void;
    /** Insert a slide from another JSON source after the current slide. */
    onGlobalInsert?: (slide: Record<string, unknown>, query: string) => void;
    slides?: any[];
    searchType?: 'lectionary' | 'liturgy';
}

export function SearchOverlay({
    open,
    onOpenChange,
    onLocalResult,
    onGlobalInsert,
    slides = EMPTY_SLIDES,
    searchType = 'liturgy',
}: SearchOverlayProps) {
    const [mode, setMode] = useState<SearchMode>(slides && slides.length > 0 ? 'local' : 'global');
    const [query, setQuery] = useState('');
    const [localGrouped, setLocalGrouped] = useState<Record<string, any[]>>({});
    const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchScope, setSearchScope] = useState<'all' | 'liturgy' | 'lectionary' | 'synaxarium'>('all');

    useEffect(() => {
        if (open) {
            setMode(slides && slides.length > 0 ? 'local' : 'global');
        }
    }, [open, slides]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // المفاتيح اللي عايزين نعطل تأثيرها الـ Global
            const keysToInhibit = [' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];

            if (keysToInhibit.includes(e.key)) {
                // نتحقق إذا كان المستخدم بيكتب فعلاً في الـ input
                const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

                if (isInput) {
                    // نوقف انتشار الحدث عشان الـ global listeners (زي مكتبات الـ slides) ما تحسش بيه
                    e.stopPropagation();
                } else {
                    // لو ضغط مسطرة وهو مش في الـ input، نمنع الأكشن الافتراضي (السكول مثلاً)
                    if (e.key === ' ') e.preventDefault();
                }
            }
        };

        // نستخدم capture: true عشان نلقط الحدث قبل ما يوصل لأي حد تاني
        document.addEventListener('keydown', handleKeyDown, { capture: true });

        return () => {
            document.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [open]);

    useEffect(() => {
        if (!query || query.length < 2) {
            setLocalGrouped(prev => Object.keys(prev).length === 0 ? prev : {});
            return;
        }

        const timeoutId = setTimeout(() => {
            try {
                const grouped: Record<string, any[]> = {};

                slides.forEach((slide) => {
                    if (!slide.lines || !Array.isArray(slide.lines)) {
                        return;
                    }

                    const matchingLines = slide.lines.filter((line: any) => {
                        return line && line.text && SearchService.isMatch(query, line.text);
                    });

                    if (matchingLines.length > 0) {
                        const sCode = slide.section_code || 'other';
                        if (!grouped[sCode]) {
                            grouped[sCode] = [];
                        }

                        grouped[sCode].push({
                            ...slide,
                            reading_title: slide.title || slide.section_name || 'قراءة بدون عنوان',
                            matched_text: matchingLines[0].text,
                        });
                    }
                });

                setLocalGrouped(grouped);
            } catch (err) {
                console.error('Search error:', err);
                setLocalGrouped(prev => Object.keys(prev).length === 0 ? prev : {});
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, slides]);

    useEffect(() => {
        if (mode !== 'global' || !query || query.length < 2) {
            setLoading(false);
            if (mode === 'local') {
                setGlobalResults([]);
            }
            return;
        }

        const timeoutId = setTimeout(() => {
            setLoading(true);
            axios
                .get<{ results: GlobalSearchResult[] }>('/presentation/search', {
                    params: { q: query, type: searchScope },
                })
                .then((res) => {
                    setGlobalResults(res.data.results ?? []);
                })
                .catch(() => {
                    setGlobalResults([]);
                })
                .finally(() => {
                    setLoading(false);
                });
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [query, mode, searchScope]);

    const showLocalEmpty = mode === 'local' && query.length >= 2 && Object.keys(localGrouped).length === 0 && !loading;
    const showGlobalEmpty = mode === 'global' && query.length >= 2 && !loading && globalResults.length === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-card p-1 pt-10 overflow-hidden border-border shadow-lg">
                <DialogTitle className="sr-only">البحث في القراءات</DialogTitle>
                <DialogDescription className="sr-only">Search</DialogDescription>
                <div className="flex flex-col border-b border-border">
                    {slides && slides.length > 0 && (
                        <div className="flex p-1 gap-1 mx-3 mt-3 rounded-lg bg-muted/40">
                            <button
                                type="button"
                                onClick={() => setMode('local')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                                    mode === 'local' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                                )}
                            >
                                <BookOpen className="h-4 w-4" />
                                العرض الحالي
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('global')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                                    mode === 'global' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                                )}
                            >
                                <Library className="h-4 w-4" />
                                كل الملفات
                            </button>
                        </div>
                    )}
                    <div className="flex items-center px-4 py-3">
                        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                        <Input
                            className="flex-1 border-0 focus-visible:ring-0 px-4 text-lg bg-transparent"
                            placeholder={
                                mode === 'local'
                                    ? 'ابحث في شرائح العرض الحالي…'
                                    : 'ابحث في قطمارس وقداس (كل الملفات)…'
                            }
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
                        ) : (
                            query && (
                                <button type="button" onClick={() => setQuery('')} className="shrink-0">
                                    <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                                </button>
                            )
                        )}
                    </div>
                    {mode === 'global' && (
                        <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1 border-t border-border/50 bg-muted/20">
                            {[
                                { value: 'all', label: 'الكل' },
                                { value: 'liturgy', label: 'القداس الإلهي' },
                                { value: 'lectionary', label: 'القطمارس' },
                                { value: 'synaxarium', label: 'السنكسار' },
                            ].map((scopeOpt) => (
                                <button
                                    key={scopeOpt.value}
                                    type="button"
                                    onClick={() => setSearchScope(scopeOpt.value as any)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-full border transition-all cursor-pointer",
                                        searchScope === scopeOpt.value
                                            ? "bg-primary border-primary text-primary-foreground font-semibold shadow-sm"
                                            : "border-border hover:border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {scopeOpt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {mode === 'local' && (
                        <>
                            {showLocalEmpty && (
                                <p className="text-center text-muted-foreground py-8">لا توجد نتائج في هذا العرض.</p>
                            )}
                            {Object.entries(localGrouped).map(([sectionCode, items]) => (
                                <div key={sectionCode} className="mb-4">
                                    <h3 className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                        {items[0]?.section_name}
                                    </h3>
                                    {items.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                if (onLocalResult) {
                                                    onLocalResult(item.id, query);
                                                }
                                                onOpenChange(false);
                                            }}
                                            className="w-full text-right px-4 py-3 rounded-lg hover:bg-muted transition-colors flex flex-col gap-1"
                                        >
                                            <span className="font-medium text-sm text-foreground">{item.reading_title}</span>
                                            <span
                                                className="text-muted-foreground text-sm opacity-90 truncate w-full"
                                                style={{ fontFamily: 'var(--pres-font)' }}
                                                dangerouslySetInnerHTML={{
                                                    __html: SearchService.highlightMatch(query, item.matched_text || item.text || ''),
                                                }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </>
                    )}

                    {mode === 'global' && (
                        <>
                            {showGlobalEmpty && (
                                <p className="text-center text-muted-foreground py-8">لا توجد نتائج في الملفات.</p>
                            )}
                            {globalResults.map((row) => {
                                const snippet = getSnippet((row.slide as any).lines, query);
                                return (
                                    <button
                                        key={`${row.source}-${row.file}-${(row.slide as { id?: string }).id ?? row.label}`}
                                        type="button"
                                        onClick={() => {
                                            if (onGlobalInsert) {
                                                onGlobalInsert(row.slide, query);
                                            }
                                            onOpenChange(false);
                                        }}
                                        className="w-full text-right px-4 py-3 rounded-lg hover:bg-muted transition-colors flex flex-col gap-1 mb-1 border border-transparent hover:border-border"
                                    >
                                        <span className="text-xs text-primary font-semibold">{row.label}</span>
                                        <span className="font-medium text-sm text-foreground">
                                            {(row.slide as { title?: string }).title ||
                                                (row.slide as { section_name?: string }).section_name}
                                        </span>
                                        {snippet && (
                                            <span
                                                className="text-muted-foreground text-sm opacity-90 truncate w-full"
                                                style={{ fontFamily: 'var(--pres-font)' }}
                                                dangerouslySetInnerHTML={{
                                                    __html: SearchService.highlightMatch(query, snippet),
                                                }}
                                            />
                                        )}
                                        <span className="text-[11px] text-muted-foreground">
                                            {row.source === 'lectionary' ? 'قطمارس' : 'قداس'} · {row.file}
                                        </span>
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
