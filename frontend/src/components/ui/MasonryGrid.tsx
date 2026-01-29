import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import './Masonry.css';

interface MasonryGridProps {
    children: ComponentChildren;
    className?: string;
}

export function MasonryGrid({ children, className = '' }: MasonryGridProps) {
    return (
        <div class={`masonry-grid ${className}`}>
            {children}
        </div>
    );
}
