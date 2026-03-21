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
}

export function SplitViewReader({ lines, hasCoptic, className }: SplitViewReaderProps) {
    // If no Coptic, just render Arabic lines centered
    if (!hasCoptic) {
        return (
            <div className={cn("flex flex-col gap-6 text-center max-w-4xl mx-auto w-full", className)}>
                {lines.map((line, index) => (
                    <p key={line.id || index} className="text-3xl md:text-5xl leading-relaxed text-foreground font-reading font-bold drop-shadow-sm">
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
        <div className={cn("flex flex-col w-full max-w-7xl mx-auto gap-8", className)}>
            {pairedLines.map(([ar, cop], index) => (
                <div key={index} className="flex flex-col md:flex-row gap-6 md:gap-12 relative items-center md:items-stretch">
                    {/* Arabic Column (Right in RTL) */}
                    <div className="flex-1 text-center md:text-right">
                        {ar && (
                            <p className="text-3xl md:text-5xl leading-relaxed text-foreground font-reading font-bold drop-shadow-sm">
                                {ar.text}
                            </p>
                        )}
                    </div>

                    {/* Divider text/decor */}
                    <div className="hidden md:block w-px bg-border opacity-50 my-2 shadow-[0_0_10px_rgba(201,163,78,0.3)]" />

                    {/* Coptic Column (Left in RTL) */}
                    <div className="flex-1 text-center md:text-right">
                        {cop && (
                            <p className="text-3xl md:text-5xl leading-relaxed text-primary font-reading font-bold opacity-90 drop-shadow-sm">
                                {cop.text}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
