import React from 'react';
import { cn } from '@/lib/utils';
import { PanelRightClose, PanelRightOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface PresentationSidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    sections: any[];
    currentSlideCode: string;
    onJumpToSection: (code: string) => void;
}

export function PresentationSidebar({ isOpen, setIsOpen, sections, currentSlideCode, onJumpToSection }: PresentationSidebarProps) {
    if (!sections || !sections.length) return null;

    return (
        <>
            <div className={cn(
                "fixed top-0 bottom-0 right-0 z-40 w-64 bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 transition-transform duration-300 flex flex-col",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="font-bold text-lg">فهرس الصلاة</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                        <PanelRightClose className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                    {sections.map((section) => {
                        const isActive = currentSlideCode === section.code;
                        return (
                            <button
                                key={section.id}
                                onClick={() => onJumpToSection(section.code)}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-right w-full",
                                    isActive
                                        ? "bg-primary text-primary-foreground font-semibold"
                                        : "hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                )}
                            >
                                <span>{section.name_ar}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Floating button when closed */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed top-4 right-4 z-30 p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-white/20 transition-all opacity-50 hover:opacity-100"
                >
                    <PanelRightOpen className="h-6 w-6" />
                </button>
            )}
        </>
    );
}
