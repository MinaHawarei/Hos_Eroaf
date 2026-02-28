import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

interface DayContextState {
    selectedDate: string;
    resolvedCopticDate: string;
    resolvedSeason: string;
    resolvedReadings: any[];
    setDateContext: (date: string, coptic: string, season: string, readings: any[]) => void;
    changeDate: (newDate: string) => void;
}

const DayContext = createContext<DayContextState | undefined>(undefined);

export function DayProvider({ children }: { children: React.ReactNode }) {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [resolvedCopticDate, setResolvedCopticDate] = useState<string>('');
    const [resolvedSeason, setResolvedSeason] = useState<string>('');
    const [resolvedReadings, setResolvedReadings] = useState<any[]>([]);

    // Initialize from local storage on mount (if we want the app to reopen on that day)
    useEffect(() => {
        const storedDate = localStorage.getItem('hos_selected_date');
        // If we are on the home page and there's a stored date that differs from current URL
        if (storedDate && window.location.pathname === '/') {
            const urlParams = new URLSearchParams(window.location.search);
            const queryDate = urlParams.get('date');
            if (storedDate !== queryDate) {
                router.visit(`/?date=${storedDate}`, { replace: true, preserveState: false });
            }
        }
    }, []);

    const setDateContext = (date: string, coptic: string, season: string, readings: any[]) => {
        setSelectedDate(date);
        setResolvedCopticDate(coptic);
        setResolvedSeason(season);
        setResolvedReadings(readings);
        localStorage.setItem('hos_selected_date', date);
    };

    const changeDate = (newDate: string) => {
        localStorage.setItem('hos_selected_date', newDate);
        // Only home page handles date changing by navigating
        router.visit(`/?date=${newDate}`);
    };

    return (
        <DayContext.Provider value={{ selectedDate, resolvedCopticDate, resolvedSeason, resolvedReadings, setDateContext, changeDate }}>
            {children}
        </DayContext.Provider>
    );
}

export function useDayContext() {
    const context = useContext(DayContext);
    if (!context) {
        throw new Error('useDayContext must be used within a DayProvider');
    }
    return context;
}
