import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Calendar } from 'lucide-react';

interface DateSelectorProps {
    currentDate: string; // YYYY-MM-DD
    onDateChange: (date: string) => void;
}

export function DateSelector({ currentDate, onDateChange }: DateSelectorProps) {
    const [date, setDate] = useState(currentDate);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onDateChange(date);
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-3 pr-9 w-40"
                    required
                />
            </div>
            <Button type="submit" size="sm" variant="secondary">انتقال</Button>
        </form>
    );
}
