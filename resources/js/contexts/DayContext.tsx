import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * State for the global Liturgical Day context.
 * Drives the content displayed throughout the app based on the Coptic calendar.
 */
interface DayContextState {
    /** The Gregorian date string (e.g., '2024-03-23') */
    selectedDate: string;
    /** The resolved Coptic date string (e.g., '14 Baramhat 1740') */
    resolvedCopticDate: string;
    /** The liturgical season (e.g., 'The Great Fast') */
    resolvedSeason: string;
    /** Array of liturgical readings (Gospel, Epistles, etc.) for the day */
    resolvedReadings: any[];
    /** Updates the global context with new liturgical data */
    setDateContext: (date: string, coptic: string, season: string, readings: any[]) => void;
    /** Triggers a navigation to change the active date */
    changeDate: (newDate: string) => void;
}

const DayContext = createContext<DayContextState | undefined>(undefined);

/**
 * Provides liturgical date context to the entire application.
 * Persists the selected date in LocalStorage to maintain continuity.
 */
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

/**
 * Custom hook to access the DayContext.
 * Must be used within a DayProvider.
 */
export function useDayContext() {
    const context = useContext(DayContext);
    if (!context) {
        throw new Error('useDayContext must be used within a DayProvider');
    }
    return context;
}
