import type { VNode } from 'preact';
import type { SearchItem, SearchResult } from '../../types/search';
import { SearchHighlight } from './SearchHighlight';

interface SearchResultItemProps {
    result: SearchResult<SearchItem>;
    isSelected: boolean;
    onMouseEnter: () => void;
    onClick: () => void;
}

/**
 * Individual Search Result Item for the dropdown
 */
export function SearchResultItem({ result, isSelected, onMouseEnter, onClick }: SearchResultItemProps): VNode {
    const { item, matches } = result;

    // Find matches for title and description
    const titleMatch = matches?.find(m => m.key === 'title' || m.key === 'name');
    const descMatch = matches?.find(m => m.key === 'description');

    // Handle 'name' for routes vs 'title' for others
    const rawTitle = (item as any).title || (item as any).name || 'Untitled';
    const rawDesc = item.description || '';

    return (
        <div
            className={`search-result-item ${isSelected ? 'selected' : ''}`}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            role="option"
            aria-selected={isSelected}
        >
            {item.coverImage && (
                <div className="search-result-thumb">
                    <img src={item.coverImage} alt="" loading="lazy" />
                </div>
            )}

            <div className="search-result-content">
                <div className="search-result-header">
                    <span className="search-result-title">
                        <SearchHighlight text={rawTitle} indices={titleMatch?.indices} />
                    </span>
                    <span className={`search-result-badge badge-${item.collection}`}>
                        {item.collection}
                    </span>
                </div>

                {rawDesc && (
                    <p className="search-result-desc">
                        <SearchHighlight text={truncateString(rawDesc, 100)} indices={descMatch?.indices} />
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Helper to truncate strings
 */
function truncateString(str: string, num: number) {
    if (str.length <= num) return str;
    return str.slice(0, num) + '...';
}
