import { useState, useEffect, useCallback } from 'preact/hooks';
import type { FilterState } from '../../types/filter';

/**
 * Custom hook to manage filter state and sync with URL
 */
export function useFilterState(defaultState: FilterState = {}) {
    // Initialize state from URL to avoid hydration mismatch/flicker
    const [filters, setFiltersState] = useState<FilterState>(() => {
        if (typeof window === 'undefined') return defaultState;
        return parseUrlParams(window.location.search);
    });

    // Function to update a single filter
    const setFilter = useCallback((key: string, value: string | string[] | [number, number] | undefined) => {
        setFiltersState(prev => {
            const next = { ...prev };
            if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
                delete next[key];
            } else {
                next[key] = value;
            }
            return next;
        });
    }, []);

    // Function to reset all filters
    const resetFilters = useCallback(() => {
        setFiltersState({});
    }, []);

    // Sync state changes to URL
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value === undefined) return;

            if (Array.isArray(value)) {
                // Join arrays with comma (e.g. ?tags=a,b)
                params.set(key, value.join(','));
            } else {
                params.set(key, String(value));
            }
        });

        const queryString = params.toString();
        const newUrl = queryString
            ? `${window.location.pathname}?${queryString}`
            : window.location.pathname;

        // Only update if URL actually changed to avoid history spam
        if (newUrl !== window.location.pathname + window.location.search) {
            window.history.replaceState({}, '', newUrl);
        }
    }, [filters]);

    return { filters, setFilter, resetFilters };
}

/**
 * Helper: Parse URL search string into FilterState
 */
function parseUrlParams(search: string): FilterState {
    const params = new URLSearchParams(search);
    const state: FilterState = {};

    params.forEach((value, key) => {
        if (!value) return;

        // Try to detect array (comma separated)
        // Note: This matches our serialize logic. 
        // If a value inherently contains commas (rare for slugs/IDs), this might break.
        // For now, we assume filter values don't have commas.
        if (value.includes(',')) {
            state[key] = value.split(',');
        } else {
            // Numerical range check? 
            // Complicated to detect "100,200" as range vs array of strings "a,b".
            // For now, treat comma-separated always as array of strings.
            // Range sliders will need to parse strings back to numbers manually if needed, 
            // or we handle specific keys here if we knew the config.
            // To keep it generic, we return string | string[].
            // The component consuming this state matches it against its expected type.
            state[key] = value;
        }
    });

    return state;
}
