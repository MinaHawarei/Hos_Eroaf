import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SlideAlternativeSection, SlideAlternativeItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Search, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    section: SlideAlternativeSection;
    onSelect?: (index: number) => void;
}

export function AlternativeSwitcher({ section, onSelect }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const alternatives = section.alternatives;
    const activeIndex = section.active_index ?? 0;

    /**
     * label + أول كلمتين من lines[1].text
     * fallback: label بس
     */
    const getButtonLabel = (item: SlideAlternativeItem) => {
        const firstLine = item.lines?.[0];
        const twoWords = (firstLine?.text || '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .join(' ');
        return twoWords ? `${item.label} — ${twoWords}` : item.label;
    };

    const filteredAlternatives = useMemo(() => {
        if (!search.trim()) return alternatives;
        const lowerSearch = search.toLowerCase();
        return alternatives.filter((alt) => {
            const labelMatch = alt.label.toLowerCase().includes(lowerSearch);
            const contentMatch = alt.lines?.some((line) =>
                (line.text || '').toLowerCase().includes(lowerSearch)
            );
            return labelMatch || contentMatch;
        });
    }, [alternatives, search]);

    /**
     * Keyboard fix: Space/arrows لا يقلبوا الشرائح لما الـ modal مفتوح
     */
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const keysToInhibit = [' ', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown'];
            if (keysToInhibit.includes(e.key)) {
                const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
                if (e.key === ' ' && isInput) {
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [isOpen]);

    const handleSelect = (index: number) => {
        onSelect?.(index);
        setIsOpen(false);
    };

    // الـ alternatives غير الـ active
    const inactiveAlternatives = alternatives
        .map((alt, i) => ({ alt, i }))
        .filter(({ i }) => i !== activeIndex);


    // لو مفيش بدائل غير active مش محتاجين نعرض حاجة
    if (inactiveAlternatives.length === 0) return null;

    // اختيارين بس — زرار واحد للبديل
    if (alternatives.length <= 2) {
        const { alt, i } = inactiveAlternatives[0];
        return (
            <div className="w-full flex justify-start" dir="rtl">
                <Button
                    size="sm"
                    variant="outline"
                    dir="rtl"
                    className="rounded-full px-6 h-10 font-medium text-sm shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md bg-background/50 border border-border/40 hover:bg-background/90 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 text-foreground"
                    onClick={() => handleSelect(i)}
                >
                    {getButtonLabel(alt)}
                </Button>
            </div>
        );
    }

    // أكتر من اختيارين — زرار يفتح Modal
    return (
        <div className="w-full flex justify-start my-2" dir="rtl">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-6 h-10 font-medium text-sm shadow-[0_4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md bg-background/50 border border-border/40 hover:bg-background/90 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 gap-2.5 group transition-all duration-300 text-foreground"
                        dir="rtl"
                    >
                        {getButtonLabel(alternatives[activeIndex])}
                        <RotateCcw className="h-4 w-4 opacity-60 group-hover:rotate-180 transition-transform duration-500" />
                    </Button>
                </DialogTrigger>
                <DialogContent
                    className="max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden border border-border/40 shadow-2xl backdrop-blur-xl bg-background/95 heritage-modal"
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                    }}
                >
                    <div className="p-6 pb-4 bg-muted/10">
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl font-serif font-bold text-center">اختر البديل</DialogTitle>
                        </DialogHeader>
                        <div className="relative group">
                            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                            <Input
                                ref={searchInputRef}
                                placeholder="بحث داخل المحتوى..."
                                className="pr-11 rounded-2xl bg-background/80 backdrop-blur-sm border-border/50 h-12 shadow-sm focus-visible:ring-primary/20 text-right font-medium transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                dir="rtl"
                            />
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto px-4 pb-6 scroll-smooth-reader" dir="rtl">
                        <div className="flex flex-col gap-2.5">
                            {filteredAlternatives.map((alt) => {
                                const actualIndex = alternatives.findIndex(a => a === alt);
                                const isActive = activeIndex === actualIndex;
                                const previewText = alt.lines?.[0]?.text || '';

                                return (
                                    <button
                                        key={actualIndex}
                                        onClick={() => handleSelect(actualIndex)}
                                        className={cn(
                                            "flex flex-col gap-1.5 p-4 rounded-2xl w-full text-right transition-all duration-300 border text-foreground",
                                            isActive
                                                ? "bg-primary text-primary-foreground border-primary shadow-lg ring-1 ring-primary ring-offset-2 ring-offset-background scale-[0.98]"
                                                : "bg-background/60 hover:bg-muted/80 backdrop-blur-sm border-border/30 hover:border-border/60 shadow-sm hover:-translate-y-0.5"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-4 w-full">
                                            <span className="font-bold text-lg">{alt.label}</span>
                                            {isActive && <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />}
                                        </div>
                                        {previewText && (
                                            <p className={cn(
                                                "text-sm line-clamp-2 leading-relaxed opacity-70",
                                                isActive ? "text-primary-foreground" : "text-muted-foreground"
                                            )}>
                                                {previewText}...
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                            {filteredAlternatives.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground italic">
                                    لا توجد نتائج للبحث...
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
