import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { FilterPanel } from '../filter/FilterPanel';
import { MasonryGrid } from '../ui/MasonryGrid';
import { MasonryCard } from '../ui/MasonryCard';
import { useFilterState } from '../../lib/filter/useFilterState';
import { filterItems } from '../../lib/filter/filterUtils';
import { calculateFacets } from '../../lib/filter/facetUtils';
import { routesFilters } from '../../lib/filter/filterConfig';
import type { Locale } from '../../lib/i18n';
import { getFilterLabel } from '../../lib/i18n/filterTranslations';

interface RoutesPageProps {
    initialItems: any[];
    lang: Locale;
    initialFilters?: Record<string, any>;
}

export default function RoutesPage({ initialItems, lang, initialFilters = {} }: RoutesPageProps) {
    const { filters, setFilter, resetFilters } = useFilterState(initialFilters);

    const filteredItems = useMemo(() => {
        return filterItems(initialItems, filters, { filters: routesFilters });
    }, [initialItems, filters]);

    const facetConfig = useMemo(() => {
        return calculateFacets(initialItems, routesFilters);
    }, [initialItems]);

    const filterTitle = lang === 'zh' ? '筛选' : lang === 'de' ? 'Filter' : 'Filters';

    return (
        <div class="routes-page-content">
            <FilterPanel
                title={filterTitle}
                config={facetConfig}
                filters={filters}
                onFilterChange={setFilter}
                onReset={resetFilters}
                className="mb-8"
                lang={lang}
            />

            {filteredItems.length > 0 ? (
                <MasonryGrid>
                    {filteredItems.map((entry) => {
                        const data = entry.data || entry;
                        const href = `/${lang}/routes/${data.slug}`;

                        // Format meta for routes: "Distance · Elevation · Difficulty"
                        const diffLabel = getFilterLabel('difficulty', data.difficulty, lang);
                        const meta = `${data.distance}km · ${data.elevation}m ↑ · ${diffLabel}`;

                        return (
                            <MasonryCard
                                key={data.slug}
                                href={href}
                                title={data.name || data.title} // Routes might use name
                                description={data.description}
                                cover={data.cover} // Routes might not have cover? Check schema.
                                // date might not be relevant for routes sorting usually, but strictly speaking they are static pages
                                seed={data.slug}
                                lang={lang}
                                meta={meta}
                            />
                        );
                    })}
                </MasonryGrid>
            ) : (
                <div class="empty-state" style={{
                    textAlign: 'center',
                    padding: '4rem',
                    background: 'rgba(255,255,255,0.5)',
                    borderRadius: '16px',
                    marginTop: '2rem',
                    border: '2px dashed #eee',
                    color: '#666'
                }}>
                    <p>{lang === 'zh' ? '没有找到匹配的内容' : 'No matching content found'}</p>
                    <button
                        onClick={() => resetFilters()}
                        style={{
                            marginTop: '1rem',
                            padding: '8px 16px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {lang === 'zh' ? '清除筛选' : 'Clear Filters'}
                    </button>
                </div>
            )}
        </div>
    );
}
