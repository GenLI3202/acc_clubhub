import type { FilterDefinition } from '../../types/filter';

/**
 * Filter Definitions for Media Collection
 */
export const mediaFilters: FilterDefinition[] = [
    {
        key: 'type',
        label: 'Format',
        type: 'select',
        options: [
            { value: 'video', label: 'Video' },
            { value: 'interview', label: 'Interview' },
            { value: 'adventure', label: 'Adventure' },
            { value: 'gallery', label: 'Gallery' }
        ]
    },
    {
        key: 'tags',
        label: 'Tags',
        type: 'multiselect',
        options: [] // Populated dynamically via facetUtils
    }
];

/**
 * Filter Definitions for Gear Collection
 */
export const gearFilters: FilterDefinition[] = [
    {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
            { value: 'bike-build', label: 'Bike Build' },
            { value: 'electronics', label: 'Electronics' },
            { value: 'apparel', label: 'Apparel' },
            { value: 'maintenance', label: 'Maintenance' }
        ]
    },
    {
        key: 'subcategory',
        label: 'Subcategory',
        type: 'select',
        options: [] // Populated dynamically
    },
    {
        key: 'author',
        label: 'Author',
        type: 'select',
        options: [] // Populated dynamically
    }
];

/**
 * Filter Definitions for Training Collection
 */
export const trainingFilters: FilterDefinition[] = [
    {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
            { value: 'physical', label: 'Physical' },
            { value: 'planning', label: 'Planning' },
            { value: 'wellness', label: 'Wellness' },
            { value: 'analytics', label: 'Analytics' }
        ]
    },
    {
        key: 'tags',
        label: 'Tags',
        type: 'multiselect',
        options: []
    },
    {
        key: 'author',
        label: 'Author',
        type: 'select',
        options: []
    }
];

/**
 * Filter Definitions for Routes Collection
 */
export const routesFilters: FilterDefinition[] = [
    {
        key: 'region',
        label: 'Region',
        type: 'select',
        options: [
            { value: 'munich-south', label: 'Munich South' },
            { value: 'munich-north', label: 'Munich North' },
            { value: 'alps-bavaria', label: 'Bavarian Alps' },
            { value: 'alps-austria', label: 'Austrian Alps' },
            { value: 'alps-italy', label: 'Dolomites' },
            { value: 'island-spain', label: 'Spanish Islands' }
        ]
    },
    {
        key: 'difficulty',
        label: 'Difficulty',
        type: 'multiselect',
        options: [
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
            { value: 'expert', label: 'Expert' }
        ]
    },
    {
        key: 'surface',
        label: 'Surface',
        type: 'select',
        options: [
            { value: 'tarmac', label: 'Tarmac' },
            { value: 'gravel', label: 'Gravel' },
            { value: 'mixed', label: 'Mixed' }
        ]
    },
    {
        key: 'distance',
        label: 'Distance',
        type: 'range',
        min: 0,
        max: 200,
        step: 10,
        unit: 'km'
    },
    {
        key: 'elevation',
        label: 'Elevation',
        type: 'range',
        min: 0,
        max: 3000,
        step: 100,
        unit: 'm'
    }
];

/**
 * Filter Definitions for Events Collection
 */
export const eventsFilters: FilterDefinition[] = [
    {
        key: 'eventType',
        label: 'Type',
        type: 'select',
        options: [
            { value: 'social-ride', label: 'Social Ride' },
            { value: 'training-camp', label: 'Training Camp' },
            { value: 'race', label: 'Race' },
            { value: 'workshop', label: 'Workshop' }
        ]
    }
];

export const allFilterConfigs = {
    media: mediaFilters,
    gear: gearFilters,
    training: trainingFilters,
    routes: routesFilters,
    events: eventsFilters
};
