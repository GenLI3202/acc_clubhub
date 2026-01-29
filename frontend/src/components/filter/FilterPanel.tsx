import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
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
    facets?: Record<string, FilterOption[]>;
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
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Calculate active filter count
    const activeCount = Object.keys(filters).length;

    const handleReset = () => {
        if (onReset) onReset();
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`filter-panel-wrapper ${className}`} ref={panelRef}>
            {/* Toggle Button */}
            <button
                className={`filter-toggle-btn ${isOpen ? 'is-active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className="icon">⚡</span>
                <span>{title}</span>
                {activeCount > 0 && (
                    <span className="filter-count-badge">{activeCount}</span>
                )}
                {isOpen ? (
                    <span style={{ fontSize: '0.8em' }}>▲</span>
                ) : (
                    <span style={{ fontSize: '0.8em' }}>▼</span>
                )}
            </button>

            {/* Floating Overlay */}
            <div className={`filter-panel-overlay ${isOpen ? 'is-open' : ''}`}>
                <div className="filter-panel-header">
                    <h3 className="filter-panel-title">{title}</h3>
                    <div className="filter-actions">
                        {onReset && activeCount > 0 && (
                            <button className="reset-all-btn" onClick={handleReset}>
                                Reset
                            </button>
                        )}
                        <button className="close-filter-btn" onClick={() => setIsOpen(false)} aria-label="Close">
                            ✕
                        </button>
                    </div>
                </div>

                <div className="filter-panel-content">
                    {config.map((def) => {
                        const value = filters[def.key];
                        let options = def.options || [];

                        // Merge facet counts
                        if (facets[def.key]) {
                            const optionMap = new Map(options.map(o => [o.value, o]));
                            facets[def.key].forEach(facetOpt => {
                                if (optionMap.has(facetOpt.value)) {
                                    optionMap.get(facetOpt.value)!.count = facetOpt.count;
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
        </div>
    );
}
