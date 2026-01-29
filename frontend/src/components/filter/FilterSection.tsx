import { useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';

interface FilterSectionProps {
    title: string;
    isOpen?: boolean;
    children: ComponentChildren;
}

export function FilterSection({ title, isOpen = true, children }: FilterSectionProps): VNode {
    const [open, setOpen] = useState(isOpen);

    return (
        <div className="filter-section">
            <button
                className="filter-header"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
            >
                <span className="filter-title">{title}</span>
                <svg
                    className={`filter-chevron ${!open ? 'closed' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
            <div className={`filter-content ${!open ? 'closed' : ''}`}>
                {children}
            </div>
        </div>
    );
}
