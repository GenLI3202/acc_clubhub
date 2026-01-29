/**
 * Filter System Type Definitions
 * Phase 4.1: Global Search & Content Governance
 * 
 * Defines the structure for filtering, facets, and URL state management.
 */

export type FilterType = 'select' | 'multiselect' | 'range' | 'date';

/**
 * A single option in a filter (e.g., "Easy", "Hard")
 * Includes 'count' for faceted search results.
 */
export interface FilterOption {
    value: string | number;
    label: string;
    count?: number; // Number of matching items
}

/**
 * Configuration for a single filter (e.g., "Difficulty")
 */
export interface FilterDefinition {
    key: string;
    label: string;
    type: FilterType;
    options?: FilterOption[]; // For static options like Categories
    min?: number; // For range sliders
    max?: number; // For range sliders
    step?: number; // For range sliders
    unit?: string; // e.g. "km", "m"
}

/* 
 * Map collection names (e.g. 'media', 'routes') to their filter configs 
 */
export type CollectionFilterConfig = Record<string, FilterDefinition[]>;

/**
 * The runtime state of active filters
 * Key matches FilterDefinition.key
 */
export interface FilterState {
    [key: string]: string | string[] | [number, number] | undefined;
}
