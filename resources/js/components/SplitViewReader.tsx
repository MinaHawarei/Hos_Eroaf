import React from 'react';
import { cn } from '@/lib/utils';

interface SplitViewReaderProps {
    lines: Array<{
        id: number;
        lang_type: 'arabic' | 'coptic_arabized';
        text: string;
    }>;
    hasCoptic: boolean;
    className?: string;
    /** When true, text-align: justify is applied to Arabic/transliteration text */
    justified?: boolean;
}

export function SplitViewReader({ lines, hasCoptic, className, justified = true }: SplitViewReaderProps) {
    // If no Coptic, just render Arabic lines centered
    if (!hasCoptic) {
        return (
            <div className={cn("flex flex-col gap-8 max-w-5xl mx-auto w-full", className)}>
                {lines.map((line, index) => (
                    <p
                        key={line.id || index}
                        className={cn(
                            "text-2xl md:text-4xl lg:text-5xl leading-[1.8] md:leading-[2] font-reading font-bold",
                            "text-foreground drop-shadow-sm",
                            "transition-all duration-300",
                            justified ? "text-justified" : "text-center"
                        )}
                        dir="rtl"
                    >
                        {line.text}
                    </p>
                ))}
            </div>
        );
    }

    // Split lines into Arabic and Coptic
    const arabicLines = lines.filter((l) => l.lang_type === 'arabic');
    const copticLines = lines.filter((l) => l.lang_type === 'coptic_arabized');

    // Create a paired array: [[arabic1, coptic1], [arabic2, coptic2]]
    const pairedLines = [];
    const maxLen = Math.max(arabicLines.length, copticLines.length);
    for (let i = 0; i < maxLen; i++) {
        pairedLines.push([
            arabicLines[i] || null,
            copticLines[i] || null,
        ]);
    }

    return (
        <div className={cn("flex flex-col w-full max-w-7xl mx-auto gap-10", className)}>
            {pairedLines.map(([ar, cop], index) => (
                <div
                    key={index}
                    className="flex flex-col md:flex-row gap-6 md:gap-10 relative items-start md:items-stretch slide-content-enter"
                    style={{ animationDelay: `${index * 0.06}s` }}
                >
                    {/* Arabic Column (Right in RTL) */}
                    <div className="flex-1 flex items-center">
                        {ar && (
                            <p
                                className={cn(
                                    "text-2xl md:text-4xl lg:text-5xl leading-[1.8] md:leading-[2]",
                                    "text-foreground font-reading font-bold drop-shadow-sm",
                                    "w-full transition-all duration-300",
                                    justified ? "text-justified" : "text-center md:text-right"
                                )}
                                dir="rtl"
                            >
                                {ar.text}
                            </p>
                        )}
                    </div>

                    {/* Decorative column divider */}
                    <div className="hidden md:block column-divider" aria-hidden="true" />

                    {/* Coptic/Transliteration Column (Left in RTL) */}
                    <div className="flex-1 flex items-center">
                        {cop && (
                            <p
                                className={cn(
                                    "text-2xl md:text-4xl lg:text-5xl leading-[1.8] md:leading-[2]",
                                    "text-primary font-reading font-bold opacity-90 drop-shadow-sm",
                                    "w-full transition-all duration-300",
                                    justified ? "text-justified" : "text-center md:text-right"
                                )}
                                dir="rtl"
                            >
                                {cop.text}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
