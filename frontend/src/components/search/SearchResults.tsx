import type { VNode } from 'preact';
import type { SearchItem, SearchResult } from '../../types/search';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultsProps {
    results: SearchResult<SearchItem>[];
    selectedIndex: number;
    isLoading: boolean;
    onItemSelect: (index: number) => void;
    onItemClick: (result: SearchResult<SearchItem>) => void;
}

/**
 * Search Results Dropdown List
 */
export function SearchResults({
    results,
    selectedIndex,
    isLoading,
    onItemSelect,
    onItemClick
}: SearchResultsProps): VNode {

    if (isLoading) {
        return (
            <div className="search-results-empty">
                <div className="search-spinner"></div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="search-results-empty">
                No results found.
            </div>
        );
    }

    return (
        <div className="search-results-list" role="listbox">
            {results.map((result, index) => (
                <SearchResultItem
                    key={`${result.item.collection}-${result.item.slug}`}
                    result={result}
                    isSelected={index === selectedIndex}
                    onMouseEnter={() => onItemSelect(index)}
                    onClick={() => onItemClick(result)}
                />
            ))}
        </div>
    );
}
