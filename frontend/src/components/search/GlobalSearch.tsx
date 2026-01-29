import { useState, useEffect, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import { SearchBar } from './SearchBar';
import './GlobalSearch.css';

interface GlobalSearchProps {
    lang: string;
    translations?: {
        searchPlaceholder?: string;
        noResults?: string;
    };
}

export function GlobalSearch({ lang, translations }: GlobalSearchProps): VNode {
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Toggle scroll lock when overlay is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Focus input after animation
            setTimeout(() => {
                const input = document.querySelector('.global-search-overlay input') as HTMLInputElement;
                if (input) input.focus();
            }, 100);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
            // Shortcut to open search (Computed + K or just /)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    return (
        <div className="global-search-wrapper" ref={searchRef}>
            <button
                className="global-search-trigger"
                onClick={() => setIsOpen(true)}
                aria-label="Search"
                aria-expanded={isOpen}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </button>

            {isOpen && (
                <div className="global-search-overlay" onClick={(e) => {
                    if (e.target === e.currentTarget) setIsOpen(false);
                }}>
                    <div className="global-search-content">
                        <SearchBar
                            lang={lang}
                            placeholder={translations?.searchPlaceholder}
                        />
                        <div className="global-search-hint">
                            Press <kbd>Esc</kbd> to close
                        </div>
                    </div>
                    <button
                        className="global-search-close"
                        onClick={() => setIsOpen(false)}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
