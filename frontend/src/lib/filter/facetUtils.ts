import type { SearchItem } from '../../types/search';
import type { FilterDefinition, FilterOption } from '../../types/filter';

/**
 * Calculates facet counts for the given items based on filter definitions.
 * Returns a NEW array of definitions with updated option counts.
 */
export function calculateFacets(
    items: SearchItem[],
    definitions: FilterDefinition[]
): FilterDefinition[] {
    // Deep copy definitions to avoid mutating the original config
    const facets = definitions.map(def => ({
        ...def,
        options: def.options?.map(opt => ({ ...opt, count: 0 })) || []
    }));

    // Iterate over all items to count
    for (const item of items) {
        for (const def of facets) {
            // Only calculate facets for select/multiselect types
            if (def.type !== 'select' && def.type !== 'multiselect') continue;
            if (!def.options) continue;

            const itemValue = (item as any)[def.key];

            if (itemValue === undefined || itemValue === null) continue;

            // Handle array values (e.g. tags)
            if (Array.isArray(itemValue)) {
                itemValue.forEach(val => incrementCount(def.options!, val));
            } else {
                // Handle single values (e.g. difficulty)
                incrementCount(def.options!, itemValue);
            }
        }
    }

    return facets;
}

/**
 * Helper to increment count for a specific value in options
 */
function incrementCount(options: FilterOption[], value: string | number) {
    const option = options.find(opt => opt.value === value);
    if (option) {
        option.count = (option.count || 0) + 1;
    }
}
