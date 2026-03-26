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
            </button>
            <div className={`filter-content ${!open ? 'closed' : ''}`}>
                {children}
            </div>
        </div>
    );
}
