import HosLayout from '@/layouts/HosLayout';
import {
    ArrowUp,
    BookOpen,
    Mic,
    MicOff,
    Search,
    Volume2,
    X,
} from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';

// Types
type ReadingLine = {
    id: number;
    lang_type: 'arabic' | 'coptic_arabized';
    line_order: number;
    text: string;
};

type Reading = {
    id: number;
    title_ar: string;
    lines: ReadingLine[];
};

type Section = {
    id: number;
    code: string;
    name_ar: string;
    readings: Reading[];
};

type Props = {
    dayKey: string;
    copticDate: string;
    season: string;
    seasonLabel: string;
    sections: Section[];
    activeSection: string;
};

import { useListening } from '@/composables/useListening';

export default function Reader({
    dayKey,
    copticDate,
    season,
    seasonLabel,
    sections,
    activeSection,
}: Props) {
    const [currentSectionCode, setCurrentSectionCode] = useState(activeSection || sections[0]?.code || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const readerContainerRef = useRef<HTMLDivElement>(null);

    const { isListening, startListening, stopListening, result } = useListening(dayKey);
    const activeLineId = result.lineId;
    const listeningMode = result.mode;
    const confidence = result.confidence;

    // Current section data
    const currentSection = useMemo(() => {
        return sections.find((s) => s.code === currentSectionCode) || sections[0];
    }, [sections, currentSectionCode]);

    // All lines from current section for search
    const allLinesInSection = useMemo(() => {
        if (!currentSection) return [];
        return currentSection.readings.flatMap((r) =>
            r.lines.map((l) => ({ ...l, readingTitle: r.title_ar }))
        );
    }, [currentSection]);

    // Search results
    const filteredLines = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.trim();
        return allLinesInSection.filter((line) => line.text.includes(q));
    }, [allLinesInSection, searchQuery]);

    // Switch section
    const switchSection = (code: string) => {
        setCurrentSectionCode(code);
    };

    // Scroll to active line
    const scrollToLine = (lineId: number) => {
        setSearchOpen(false);
        setSearchQuery('');

        setTimeout(() => {
            const el = document.getElementById(`line-${lineId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    // Auto-scroll when activeLineId changes from sync
    useEffect(() => {
        if (activeLineId) {
            const el = document.getElementById(`line-${activeLineId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeLineId]);

    // Toggle listening
    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    // Scroll to top
    const scrollToTop = () => {
        readerContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <HosLayout
            title={`القراءات — ${seasonLabel}`}
            breadcrumbs={[
                { label: 'الرئيسية', href: '/' },
                { label: 'القراءات' },
            ]}
        >
            <div className="flex flex-col gap-4">
                {/* Header with Section Tabs + Controls */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Section Tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => switchSection(section.code)}
                                className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${currentSectionCode === section.code
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                {section.name_ar}
                            </button>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        {/* Search Toggle */}
                        <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className={`rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${searchOpen ? 'bg-primary/10 text-primary' : ''
                                }`}
                        >
                            <Search className="h-4 w-4" />
                        </button>

                        {/* Listen Button --> */}
                        <button
                            onClick={toggleListening}
                            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${isListening
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 animate-pulse'
                                : 'bg-primary text-primary-foreground shadow-sm hover:opacity-90'
                                }`}
                        >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            {isListening ? 'إيقاف' : 'استماع'}
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                {searchOpen && (
                    <div className="overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                type="text"
                                placeholder="ابحث في القراءات..."
                                className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                dir="rtl"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Search Results */}
                        {filteredLines.length > 0 && (
                            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-sm">
                                {filteredLines.map((line) => (
                                    <button
                                        key={line.id}
                                        onClick={() => scrollToLine(line.id)}
                                        className="block w-full rounded-lg px-3 py-2 text-right text-sm transition-colors hover:bg-muted"
                                    >
                                        <span className="text-foreground">{line.text}</span>
                                        <span className="mt-0.5 block text-xs text-muted-foreground">
                                            {line.readingTitle}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Listening Status Bar */}
                {isListening && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20 animate-in zoom-in-95 duration-300">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute h-8 w-8 animate-ping rounded-full bg-red-400/30" />
                            <Volume2 className="relative h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                جاري الاستماع...
                            </p>
                            <p className="text-xs text-red-600/70 dark:text-red-400/60">
                                الوضع:{' '}
                                {listeningMode === 'arabic' ? 'عربي' : 'قبطي معرّب'}{' '}
                                · الثقة:{' '}
                                {Math.round(confidence * 100)}%
                            </p>
                        </div>
                    </div>
                )}

                {/* Reader Content */}
                <div
                    ref={readerContainerRef}
                    className="relative min-h-[50vh] rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
                >
                    {currentSection ? (
                        <div className="space-y-8">
                            {currentSection.readings.map((reading) => (
                                <div key={reading.id} className="space-y-3">
                                    {/* Reading Title */}
                                    <h3 className="flex items-center gap-2 border-b border-border pb-2 text-base font-bold text-foreground">
                                        <BookOpen className="h-4 w-4 text-accent" />
                                        {reading.title_ar}
                                    </h3>

                                    {/* Reading Lines */}
                                    <div className="space-y-1">
                                        {reading.lines.map((line) => (
                                            <div
                                                key={line.id}
                                                id={`line-${line.id}`}
                                                className={`rounded-md px-3 py-2 transition-all duration-300 ${activeLineId === line.id ? 'bg-primary/20 border-r-4 border-primary ring-1 ring-primary/30' : 'hover:bg-muted/50'
                                                    } ${line.lang_type === 'coptic_arabized' ? 'text-accent font-medium' : 'text-foreground'
                                                    }`}
                                            >
                                                <span className="inline-block leading-relaxed">
                                                    {line.text}
                                                </span>
                                                {line.lang_type === 'coptic_arabized' && (
                                                    <span className="mr-2 inline-block rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                                                        قبطي
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                            <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                            <p className="mt-3 text-sm text-muted-foreground">
                                اختر قسمًا لعرض القراءات
                            </p>
                        </div>
                    )}

                    {/* Back to Top FAB */}
                    <button
                        onClick={scrollToTop}
                        className="fixed bottom-6 left-6 z-40 rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-all hover:shadow-xl active:scale-90"
                        title="العودة للأعلى"
                    >
                        <ArrowUp className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </HosLayout>
    );
}
