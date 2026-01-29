import type { VNode } from 'preact';
import { FilterSection } from './FilterSection';
import { FilterCheckboxGroup } from './FilterCheckboxGroup';
import { FilterRangeSlider } from './FilterRangeSlider';
import type { FilterDefinition, FilterState, FilterOption } from '../../types/filter';
import './FilterComponents.css';

interface FilterPanelProps {
    title?: string;
    config: FilterDefinition[];
    filters: FilterState;
    facets?: Record<string, FilterOption[]>; // Facet counts from search results
    onFilterChange: (field: string, value: any) => void;
    onReset?: () => void;
    className?: string;
}

export function FilterPanel({
    title = 'Filters',
    config,
    filters,
    facets = {},
    onFilterChange,
    onReset,
    className = ''
}: FilterPanelProps): VNode {

    const handleReset = () => {
        if (onReset) onReset();
    };

    return (
        <div className={`filter-panel ${className}`}>
            <div className="filter-panel-header">
                <h3 className="filter-panel-title">{title}</h3>
                {onReset && (
                    <button className="reset-all-btn" onClick={handleReset}>
                        Reset All
                    </button>
                )}
            </div>

            <div className="filter-panel-content">
                {config.map((def) => {
                    const value = filters[def.key];

                    // For checkboxes, merge static options with facet counts
                    let options = def.options || [];
                    if (facets[def.key]) {
                        // Create a map of existing options for quick lookup
                        const optionMap = new Map(options.map(o => [o.value, o]));

                        // Update counts for existing options and add dynamic ones if needed
                        facets[def.key].forEach(facetOpt => {
                            if (optionMap.has(facetOpt.value)) {
                                optionMap.get(facetOpt.value)!.count = facetOpt.count;
                            } else {
                                // Optional: Add dynamic options if they weren't in static config
                                // optionMap.set(facetOpt.value, facetOpt);
                            }
                        });
                    }

                    return (
                        <FilterSection key={def.key} title={def.label}>
                            {def.type === 'multiselect' || def.type === 'select' ? (
                                <FilterCheckboxGroup
                                    field={def.key}
                                    options={options}
                                    selectedValues={(value as string[]) || []}
                                    onChange={onFilterChange}
                                />
                            ) : def.type === 'range' ? (
                                <FilterRangeSlider
                                    min={def.min || 0}
                                    max={def.max || 100}
                                    value={(value as [number, number]) || [def.min || 0, def.max || 100]}
                                    unit={def.unit}
                                    step={def.step}
                                    onChange={(range) => onFilterChange(def.key, range)}
                                />
                            ) : (
                                <div>Unsupported filter type: {def.type}</div>
                            )}
                        </FilterSection>
                    );
                })}
            </div>
        </div>
    );
}
