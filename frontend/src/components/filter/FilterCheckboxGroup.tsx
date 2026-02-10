import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { FilterOption } from '../../types/filter';
import type { Locale } from '../../lib/i18n';
import { getFilterLabel } from '../../lib/i18n/filterTranslations';

interface FilterCheckboxGroupProps {
    field: string;
    options: FilterOption[];
    selectedValues: string[];
    onChange: (field: string, values: string[]) => void;
    lang: Locale;
}

export function FilterCheckboxGroup({ field, options, selectedValues, onChange, lang }: FilterCheckboxGroupProps): VNode {
    const [showAll, setShowAll] = useState(false);

    // Sort options: selected first, then by count (desc), then alphabetical
    // Actually, usually stable order is better, but let's just show provided order or simple count sort?
    // Let's stick to provided order for now to avoid jumping UI.

    const visibleOptions = showAll ? options : options.slice(0, 5);
    const hasMore = options.length > 5;

    const handleChange = (value: string, checked: boolean) => {
        let newValues;
        if (checked) {
            newValues = [...selectedValues, value];
        } else {
            newValues = selectedValues.filter(v => v !== value);
        }
        onChange(field, newValues);
    };

    if (options.length === 0) {
        return <div className="filter-empty">No options available</div>;
    }

    return (
        <div className="filter-checkbox-group">
            {visibleOptions.map((option) => (
                <label key={String(option.value)} className="checkbox-label">
                    <input
                        type="checkbox"
                        className="checkbox-input"
                        value={String(option.value)}
                        checked={selectedValues.includes(String(option.value))}
                        onChange={(e) => handleChange(String(option.value), (e.target as HTMLInputElement).checked)}
                    />
                    <span className="checkbox-text">{getFilterLabel(field, option.value, lang)}</span>
                    <span className="checkbox-count">({option.count || 0})</span>
                </label>
            ))}

            {hasMore && (
                <button
                    className="show-more-btn"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Show Less' : `Show All (${options.length})`}
                </button>
            )}
        </div>
    );
}
