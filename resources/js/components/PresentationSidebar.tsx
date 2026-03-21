import React from 'react';
import { cn } from '@/lib/utils';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
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
            {/* Overlay backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar panel */}
            <div className={cn(
                "fixed top-0 bottom-0 right-0 z-40 w-72 flex flex-col transition-transform duration-300 ease-in-out",
                "bg-card border-l border-border shadow-xl",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-serif font-bold text-lg text-foreground flex items-center gap-2">
                        <span className="w-5 h-5 bg-primary/20 rounded flex items-center justify-center">
                            <span className="w-2 h-2 bg-primary rounded-sm" />
                        </span>
                        فهرس الصلاة
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <PanelRightClose className="h-5 w-5" />
                    </Button>
                </div>

                {/* Section list */}
                <div className="flex-1 overflow-y-auto p-3 scroll-smooth-reader">
                    <div className="flex flex-col gap-1">
                        {sections.map((section, index) => {
                            const isActive = currentSlideCode === section.code;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => onJumpToSection(section.code)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-right w-full group",
                                        isActive
                                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                            : "hover:bg-muted text-foreground/80 hover:text-foreground"
                                    )}
                                >
                                    {/* Index number */}
                                    <span className={cn(
                                        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                        isActive
                                            ? "bg-primary-foreground/20 text-primary-foreground"
                                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                    )}>
                                        {index + 1}
                                    </span>
                                    <span className="flex-1 truncate">{section.name_ar}</span>
                                    {isActive && (
                                        <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full flex-shrink-0 animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                        {sections.length} قسم
                    </p>
                </div>
            </div>

            {/* Floating toggle button (when sidebar is closed) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        "fixed top-4 right-4 z-30 p-2.5 rounded-full transition-all duration-300",
                        "pres-toolbar text-muted-foreground hover:text-foreground",
                        "opacity-60 hover:opacity-100 hover:scale-105"
                    )}
                    aria-label="فتح فهرس الصلاة"
                >
                    <PanelRightOpen className="h-5 w-5" />
                </button>
            )}
        </>
    );
}
