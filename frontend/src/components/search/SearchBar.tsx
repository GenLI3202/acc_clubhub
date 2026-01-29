import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import Fuse from 'fuse.js';
import { loadSearchIndex } from '../../lib/search/searchIndex';
import { fuseConfig } from '../../lib/search/fuseConfig';
import type { SearchItem, SearchResult, Language } from '../../types/search';

interface SearchBarProps {
    lang: Language;
    placeholder?: string;
}

export default function SearchBar({ lang, placeholder = 'Search...' }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isIndexLoaded, setIsIndexLoaded] = useState(false);

    // Refs
    const fuseRef = useRef<Fuse<SearchItem> | null>(null);
    const debounceTimer = useRef<number | null>(null);

    /**
     * Lazy Load Index on Focus
     */
    const handleFocus = async () => {
        if (isIndexLoaded) return;

        setIsLoading(true);
        try {
            const indexData = await loadSearchIndex(lang);

            // Flatten collections into single array for Fuse
            const allItems: SearchItem[] = [
                ...indexData.collections.media,
                ...indexData.collections.gear,
                ...indexData.collections.training,
                ...indexData.collections.routes,
                ...indexData.collections.events
            ];

            fuseRef.current = new Fuse(allItems, fuseConfig);
            setIsIndexLoaded(true);
            console.log(`[SearchBar] Ready. ${allItems.length} items indexed.`);
        } catch (e) {
            console.error('[SearchBar] Failed to init Fuse:', e);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle Input with Debounce
     */
    const handleInput = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setQuery(value);

        if (debounceTimer.current) {
            window.clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = window.setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    /**
     * Execute Search
     */
    const performSearch = (q: string) => {
        if (!q.trim() || !fuseRef.current) {
            setResults([]);
            return;
        }

        const fuseResults = fuseRef.current.search(q);
        // Limit to top 10 for performance
        setResults(fuseResults.slice(0, 10));
    };

    return (
        <div class="search-bar-container" style="position: relative; width: 100%; max-width: 300px;">
            <div class="search-input-wrapper">
                <input
                    type="text"
                    value={query}
                    onInput={handleInput}
                    onFocus={handleFocus}
                    placeholder={isLoading ? 'Loading index...' : placeholder}
                    disabled={isLoading}
                    style="width: 100%; padding: 8px 12px; border-radius: 20px; border: 1px solid #ccc;"
                />
                {isLoading && <span style="position: absolute; right: 10px; top: 8px;">⏳</span>}
            </div>

            {/* Temporary Result List (Debug Only) */}
            {results.length > 0 && (
                <ul style="position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid #eee; padding: 0; margin-top: 4px; list-style: none; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    {results.map((res) => (
                        <li
                            key={res.item.slug}
                            style="padding: 8px 12px; border-bottom: 1px solid #f5f5f5; cursor: pointer;"
                            onClick={() => window.location.href = `/${res.item.lang}/${res.item.collection}/${res.item.slug}`}
                        >
                            <div style="font-weight: bold; font-size: 0.9em;">
                                {/* Safe access to title or name */}
                                {'title' in res.item ? res.item.title : res.item.name}
                            </div>
                            <div style="font-size: 0.75em; color: #666;">
                                {res.item.collection} · {res.item.slug}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {query && results.length === 0 && isIndexLoaded && (
                <div style="position: absolute; top: 100%; padding: 10px; background: white; width: 100%; border: 1px solid #eee;">
                    No results found.
                </div>
            )}
        </div>
    );
}
