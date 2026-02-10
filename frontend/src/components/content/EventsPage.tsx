import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { FilterPanel } from '../filter/FilterPanel';
import { MasonryGrid } from '../ui/MasonryGrid';
import { MasonryCard } from '../ui/MasonryCard';
import { useFilterState } from '../../lib/filter/useFilterState';
import { filterItems } from '../../lib/filter/filterUtils';
import { calculateFacets } from '../../lib/filter/facetUtils';
import { eventsFilters } from '../../lib/filter/filterConfig';
import type { Locale } from '../../lib/i18n';
import { getFilterLabel } from '../../lib/i18n/filterTranslations';

interface EventsPageProps {
    initialItems: any[];
    lang: Locale;
    initialFilters?: Record<string, any>;
}

export default function EventsPage({ initialItems, lang, initialFilters = {} }: EventsPageProps) {
    const { filters, setFilter, resetFilters } = useFilterState(initialFilters);

    const filteredItems = useMemo(() => {
        return filterItems(initialItems, filters, { filters: eventsFilters });
    }, [initialItems, filters]);

    const facetConfig = useMemo(() => {
        return calculateFacets(initialItems, eventsFilters);
    }, [initialItems]);

    const filterTitle = lang === 'zh' ? '筛选' : lang === 'de' ? 'Filter' : 'Filters';

    return (
        <div class="events-page-content">
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
                        const href = `/${lang}/events/${data.slug}`;

                        return (
                            <MasonryCard
                                key={data.slug}
                                href={href}
                                title={data.title}
                                description={data.description}
                                cover={data.cover}
                                date={data.date}
                                seed={data.slug}
                                lang={lang}
                                meta={getFilterLabel('eventType', data.eventType, lang)}
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
