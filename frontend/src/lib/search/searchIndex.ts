import type { SearchIndex, SearchItem } from '../../types/search';

// Simple cache to store index promises per language
const indexCache: Record<string, Promise<SearchItem[]>> = {};

/**
 * Loads the search index for a given language.
 * Flattens the nested collections into a single searchable array.
 */
export function loadSearchIndex(lang: string): Promise<SearchItem[]> {
    // Return cached promise if available
    const existingPromise = indexCache[lang];
    if (existingPromise) {
        return existingPromise;
    }

    // Create new fetch promise
    indexCache[lang] = fetch(`/api/search-index.${lang}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load search index for ${lang}: ${response.statusText}`);
            }
            return response.json() as Promise<SearchIndex>;
        })
        .then(data => {
            // Normalization: Flatten collections into a single array for Fuse.js
            // collections is { media: [...], routes: [...], ... }
            const flattened: SearchItem[] = Object.values(data.collections).flat();

            console.log(`[Search] Loaded and flattened ${flattened.length} items for ${lang}`);
            return flattened;
        })
        .catch(error => {
            console.error(`[Search] Loader error:`, error);
            // Clean up cache on error so it can be retried
            delete indexCache[lang];
            return []; // Return empty array so search engine doesn't crash
        });

    return indexCache[lang];
}
