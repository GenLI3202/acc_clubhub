import type { SearchIndex, Language } from '../../types/search';

// Singleton Cache: Stores promises to prevent multiple simultaneous fetches
const indexCache: Record<string, Promise<SearchIndex>> = {};

/**
 * Type Guard to verify the structure of the fetched index
 */
function isValidSearchIndex(data: any): data is SearchIndex {
    return (
        data &&
        typeof data === 'object' &&
        typeof data.version === 'string' &&
        typeof data.collections === 'object'
    );
}

/**
 * Smart Search Index Loader
 * - Singleton pattern (prevents double fetching)
 * - Error Boundary (returns empty index on failure)
 * - Language aware
 */
export async function loadSearchIndex(lang: Language): Promise<SearchIndex> {
    // 1. Return cached promise if exists
    if (indexCache[lang]) {
        return indexCache[lang];
    }

    // 2. Create new fetch promise
    const fetchPromise = (async () => {
        try {
            console.log(`[Search] Loading index for lang: ${lang}...`);
            const response = await fetch(`/api/search-index.${lang}.json`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 3. Validate structure
            if (!isValidSearchIndex(data)) {
                throw new Error('Invalid JSON structure');
            }

            console.log(`[Search] Index loaded. ${Object.keys(data.collections).length} collections.`);
            return data;

        } catch (error) {
            console.error(`[Search] Failed to load index for ${lang}:`, error);

            // 4. Error Boundary: Return empty safe fallback
            // This ensures the frontend doesn't crash, it just shows no results.
            return {
                version: '0.0.0',
                generated: new Date().toISOString(),
                lang,
                collections: {
                    media: [],
                    gear: [],
                    training: [],
                    routes: [],
                    events: []
                }
            };
        }
    })();

    // 5. Store in cache
    indexCache[lang] = fetchPromise;

    return fetchPromise;
}
