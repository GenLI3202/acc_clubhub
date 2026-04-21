// components/content/GearLibraryPage.tsx
// Interactive all-articles section for the gear library page.
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { FilterPanel } from '../filter/FilterPanel';
import { ArticleCard } from '../knowledge/ArticleCard';
import { useFilterState } from '../../lib/filter/useFilterState';
import { filterItems } from '../../lib/filter/filterUtils';
import { calculateFacets } from '../../lib/filter/facetUtils';
import { gearFilters, sortFilters } from '../../lib/filter/filterConfig';
import type { Locale } from '../../lib/i18n';
import { getFilterLabel } from '../../lib/i18n/filterTranslations';
import './TrainingLibraryPage.css';

interface GearLibraryPageProps {
  initialItems: any[];
  lang: Locale;
  initialFilters?: Record<string, any>;
}

export default function GearLibraryPage({
  initialItems,
  lang,
  initialFilters = {},
}: GearLibraryPageProps) {
  const { filters, setFilter, resetFilters } = useFilterState(initialFilters);

  const combinedFilters = useMemo(() => [...gearFilters, ...sortFilters], []);

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
      ? '没有找到匹配的内容'
      : lang === 'de'
        ? 'Keine passenden Inhalte'
        : 'No matching content';
  const clearLabel =
    lang === 'zh'
      ? '清除筛选'
      : lang === 'de'
        ? 'Filter zurücksetzen'
        : 'Clear Filters';

  return (
    <div class="training-library-content" id="all-articles">
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
        <div class="article-grid">
          {filteredItems.map((entry) => {
            const data = entry.data || entry;
            return (
              <ArticleCard
                key={data.slug}
                href={`/${lang}/knowledge/gear/${data.slug}`}
                title={data.title}
                description={data.description}
                cover={data.coverImage || data.cover}
                date={data.date}
                tagLabel={getFilterLabel('category', data.category, lang)}
                lang={lang}
              />
            );
          })}
        </div>
      ) : (
        <div class="training-library-empty">
          <p>{emptyMsg}</p>
          <button onClick={() => resetFilters()}>{clearLabel}</button>
        </div>
      )}
    </div>
  );
}
