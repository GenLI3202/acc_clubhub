import { useState, useEffect, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import Fuse from 'fuse.js';
import type { SearchItem, SearchResult } from '../../types/search';
import { fuseConfig } from '../../lib/search/fuseConfig';
import { loadSearchIndex } from '../../lib/search/searchIndex';
import { SearchResults } from './SearchResults';
import './SearchBar.css';

interface SearchBarProps {
    lang: string;
    placeholder?: string;
}

export function SearchBar({ lang, placeholder = 'Search...' }: SearchBarProps): VNode {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult<SearchItem>[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize Fuse when index is loaded
    const initSearch = async () => {
        if (fuse) return;
        setIsLoading(true);
        try {
            const items = await loadSearchIndex(lang);
            const newFuse = new Fuse(items, fuseConfig);
            setFuse(newFuse);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce query
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => clearTimeout(handler);
    }, [query]);

    // Perform search
    useEffect(() => {
        if (!fuse || debouncedQuery.length < 1) {
            setResults([]);
            return;
        }

        const searchResults = fuse.search(debouncedQuery);
        setResults(searchResults.slice(0, 10) as SearchResult<SearchItem>[]);
        setSelectedIndex(0);
    }, [debouncedQuery, fuse]);

    // Handle outside click to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard Navigation
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && results[selectedIndex]) {
                handleNavigate(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleNavigate = (result: SearchResult<SearchItem>) => {
        const { collection, slug, lang } = result.item;
        // Map collection names to URL paths if necessary
        // Currently they match: /en/media/slug
        window.location.href = `/${lang}/${collection}/${slug}`;
    };

    return (
        <div className="search-container" ref={containerRef} onKeyDown={handleKeyDown}>
            <div className="search-input-wrapper">
                <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    className="search-input"
                    value={query}
                    onInput={(e) => {
                        setQuery((e.target as HTMLInputElement).value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        initSearch();
                        setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    aria-label="Search"
                    aria-autocomplete="list"
                    aria-controls="search-results"
                />
            </div>

            {isOpen && query.length >= 1 && (
                <div className="search-results-container" id="search-results">
                    <SearchResults
                        results={results}
                        selectedIndex={selectedIndex}
                        isLoading={isLoading}
                        onItemSelect={setSelectedIndex}
                        onItemClick={handleNavigate}
                    />
                </div>
            )}
        </div>
    );
}
