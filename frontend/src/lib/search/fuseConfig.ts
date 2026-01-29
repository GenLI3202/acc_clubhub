import type { IFuseOptions } from 'fuse.js';
import type { SearchItem } from '../../types/search';

/**
 * Fuse.js Search Configuration
 * Optimized for mixed content (titles, descriptions, tags)
 */
export const fuseConfig: IFuseOptions<SearchItem> = {
    // Search Keys & Weights
    keys: [
        { name: 'title', weight: 0.7 },       // Exact matches in title are most important
        { name: 'name', weight: 0.7 },        // For routes which use 'name' instead of 'title'
        { name: 'tags', weight: 0.2 },        // Tags are good context
        { name: 'description', weight: 0.1 }, // Descriptions are long, low weight
        { name: 'category', weight: 0.2 },
        { name: 'subcategory', weight: 0.2 },
        { name: 'region', weight: 0.2 },
        { name: 'location', weight: 0.2 }
    ],

    // Fuzzy Matching Sensitivity
    threshold: 0.4,       // 0.0 = exact match, 1.0 = match anything. 0.4 is a balanced default.
    distance: 100,        // How close the match must be to the location (0)

    // Logic Optimization
    ignoreLocation: true, // Important for 'description' searches! We don't care WHERE in the text the match is.
    ignoreFieldNorm: true,// Important! Prevents short fields (like tags) from dominating long fields (desc).

    // Result format
    includeScore: true,
    includeMatches: true, // For highlighting
    minMatchCharLength: 1,
};
