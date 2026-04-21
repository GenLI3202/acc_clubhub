// components/content/RoutesLibraryPage.tsx
// Interactive all-routes section for the routes library page.
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { FilterPanel } from '../filter/FilterPanel';
import { RouteCard } from '../routes/RouteCard';
import { useFilterState } from '../../lib/filter/useFilterState';
import { filterItems } from '../../lib/filter/filterUtils';
import { calculateFacets } from '../../lib/filter/facetUtils';
import { routesFilters, sortFilters } from '../../lib/filter/filterConfig';
import type { Locale } from '../../lib/i18n';
import './RoutesLibraryPage.css';

interface RoutesLibraryPageProps {
  initialItems: any[];
  lang: Locale;
  initialFilters?: Record<string, any>;
}

export default function RoutesLibraryPage({
  initialItems,
  lang,
  initialFilters = {},
}: RoutesLibraryPageProps) {
  const { filters, setFilter, resetFilters } = useFilterState(initialFilters);

  const combinedFilters = useMemo(() => [...routesFilters, ...sortFilters], []);

  const filteredItems = useMemo(
    () => filterItems(initialItems, filters, { filters: combinedFilters }),
    [initialItems, filters, combinedFilters],
  );

  const facetConfig = useMemo(
    () => calculateFacets(initialItems, combinedFilters),
    [initialItems, combinedFilters],
  );

  const filterTitle = lang === 'zh' ? '筛选' : lang === 'de' ? 'Filter' : 'Filters';
  const emptyMsg =
    lang === 'zh'
      ? '没有找到匹配的路线'
      : lang === 'de'
        ? 'Keine passenden Routen'
        : 'No matching routes';
  const clearLabel =
    lang === 'zh'
      ? '清除筛选'
      : lang === 'de'
        ? 'Filter zurücksetzen'
        : 'Clear Filters';

  return (
    <div class="routes-library-content" id="all-routes">
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
        <div class="route-grid">
          {filteredItems.map((entry) => {
            const data = entry.data || entry;
            return (
              <RouteCard
                key={data.slug}
                href={`/${lang}/routes/${data.slug}`}
                name={data.name}
                cover={data.coverImage || data.cover}
                difficulty={data.difficulty}
                region={data.region}
                distance={data.distance}
                elevation={data.elevation}
                surface={data.surface}
                lang={lang}
              />
            );
          })}
        </div>
      ) : (
        <div class="routes-library-empty">
          <p>{emptyMsg}</p>
          <button onClick={() => resetFilters()}>{clearLabel}</button>
        </div>
      )}
    </div>
  );
}
