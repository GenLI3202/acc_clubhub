import type { FilterState, FilterDefinition } from '../../types/filter';

type FilterConfig = { filters: FilterDefinition[] };

/**
 * Filter items based on the current filter state and configuration.
 * @param items Array of items to filter
 * @param filters Current filter state (URL params)
 * @param config Filter configuration specific to the collection
 * @returns Filtered array of items
 */
export function filterItems<T extends Record<string, any>>(
    items: T[],
    filters: FilterState,
    config: FilterConfig
): T[] {
    return items.filter((item) => {
        // Iterate through each configured filter
        for (const filterDef of config.filters) {
            const filterKey = filterDef.key;
            const filterValue = filters[filterKey];

            // Skip if no filter value is set
            if (filterValue === undefined || filterValue === null || filterValue === '') {
                continue;
            }

            // Handle different filter types
            switch (filterDef.type) {
                case 'select':
                case 'multiselect': {
                    // Get the item's value for this property
                    const itemValue = getValueByPath(item, filterKey);

                    if (Array.isArray(filterValue)) {
                        // If filter is multiple, item must match one of them
                        if (!filterValue.includes(String(itemValue))) {
                            return false;
                        }
                    } else {
                        // Single value match
                        if (String(itemValue) !== String(filterValue)) {
                            return false;
                        }
                    }
                    break;
                }

                case 'range': {
                    // Expecting filterValue to be [min, max]
                    if (Array.isArray(filterValue) && filterValue.length === 2) {
                        const [min, max] = filterValue as [number, number];
                        const itemValue = Number(getValueByPath(item, filterKey));

                        if (isNaN(itemValue) || itemValue < min || itemValue > max) {
                            return false;
                        }
                    }
                    break;
                }

                case 'date': {
                    // TODO: Implement date range logic if needed
                    break;
                }
            }
        }

        return true;
    });
}

/**
 * Safely access object property by dot notation path (e.g., 'data.difficulty')
 */
function getValueByPath(obj: any, path: string): any {
    // If property exists directly (flat object from search index)
    if (path in obj) return obj[path];

    // If dot notation (nested object from Astro Collection Entry)
    // But wait, Astro Collections structure is usually: id, data: { ... }
    // Our Search Index structure is flat: slug, title, difficulty, etc.
    // The filtering should ideally work on a UNIFIED structure.
    // If we pass Astro Entries, difficulty is at `entry.data.difficulty`.
    // If we pass Search Items, difficulty is at `item.difficulty`.

    // Let's support both for flexibility.
    // If 'difficulty' is requested:
    // 1. Check obj['difficulty']
    // 2. Check obj['data']['difficulty']

    if (obj[path] !== undefined) return obj[path];

    if (obj.data && obj.data[path] !== undefined) return obj.data[path];

    return undefined;
}
