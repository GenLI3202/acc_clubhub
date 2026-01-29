import { h } from 'preact';
import './Masonry.css';

export interface MasonryCardProps {
    href: string;
    title: string;
    description?: string;
    cover?: string;
    date?: Date | string;
    meta?: string;
    metaType?: 'default' | 'author';
    seed?: string;
}

export function MasonryCard({
    href,
    title,
    description,
    cover,
    date,
    meta,
    metaType = 'default',
    seed = '',
}: MasonryCardProps) {
    // Safe date formatting
    const dateObj = date ? (date instanceof Date ? date : new Date(date)) : null;
    const isValidDate = dateObj && !isNaN(dateObj.getTime());

    const formattedDate = isValidDate
        ? dateObj.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
        : null;

    // Seeded random logic
    function seededRandom(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    const randomValue = seededRandom(seed || title);
    const heights = [160, 200, 240, 280, 220, 180];
    const coverHeight = heights[randomValue % heights.length];

    return (
        <a href={href} class="masonry-card">
            {cover ? (
                <div class="masonry-card-cover" style={{ height: `${coverHeight}px` }}>
                    <img src={cover} alt={title} loading="lazy" />
                </div>
            ) : (
                <div
                    class="masonry-card-cover masonry-card-cover--placeholder"
                    style={{ height: `${coverHeight}px` }}
                >
                    <span>📄</span>
                </div>
            )}
            <div class="masonry-card-body">
                <h3>{title}</h3>
                {description && <p class="masonry-card-desc">{description}</p>}
                <div class="masonry-card-meta">
                    {formattedDate && <span class="masonry-card-date">{formattedDate}</span>}
                    {meta && (
                        <span class={`masonry-card-tag ${metaType === 'author' ? 'masonry-card-tag--author' : ''}`}>
                            {meta}
                        </span>
                    )}
                </div>
            </div>
        </a>
    );
}
