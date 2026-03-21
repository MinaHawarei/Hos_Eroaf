import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function SearchOverlay({ open, onOpenChange, onResultClick }: { open: boolean, onOpenChange: (open: boolean) => void, onResultClick: (result: any) => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query || query.length < 3) {
            setResults({});
            return;
        }

        const timeoutId = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
                setResults(res.data.results);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Use a custom Title visually hidden to meet accessibility requirements if Dialog Title is not desired
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-card p-0 overflow-hidden border-border shadow-lg">
                <DialogTitle className="sr-only">البحث في القراءات</DialogTitle>
                <div className="flex items-center border-b border-border px-4 py-3">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <Input
                        className="flex-1 border-0 focus-visible:ring-0 px-4 text-lg bg-transparent"
                        placeholder="ابحث في الكلمات، الآيات..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                        query && <button onClick={() => setQuery('')}><X className="h-5 w-5 text-muted-foreground hover:text-foreground" /></button>
                    )}
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {Object.keys(results).length === 0 && query.length >= 3 && !loading && (
                        <p className="text-center text-muted-foreground py-8">لا توجد نتائج مطابقة لبحثك.</p>
                    )}

                    {Object.entries(results).map(([sectionCode, items]) => (
                        <div key={sectionCode} className="mb-4">
                            <h3 className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                {items[0]?.section_name}
                            </h3>
                            {items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onResultClick(item)}
                                    className="w-full text-right px-4 py-3 rounded-lg hover:bg-muted transition-colors flex flex-col gap-1"
                                >
                                    <span className="font-medium text-sm text-foreground">{item.reading_title}</span>
                                    <span className="text-muted-foreground text-sm opacity-90 truncate w-full"
                                        dangerouslySetInnerHTML={{
                                            __html: item.text.replace(new RegExp(query, 'gi'), (match: string) => `<mark class="bg-primary/20 text-primary rounded px-1 font-bold">${match}</mark>`)
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
