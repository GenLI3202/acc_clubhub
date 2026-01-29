import type { VNode } from 'preact';

interface SearchHighlightProps {
    text: string;
    indices: readonly [number, number][] | undefined;
}

/**
 * Highlights segments of text based on Fuse.js match indices.
 * Example indices: [[0, 2], [5, 10]]
 */
export function SearchHighlight({ text, indices }: SearchHighlightProps): VNode {
    if (!indices || indices.length === 0) {
        return <span>{text}</span>;
    }

    const result: (VNode | string)[] = [];
    let lastIndex = 0;

    // Fuse indices are [start, end] inclusive
    indices.forEach(([start, end], i) => {
        // Add text before the match
        if (start > lastIndex) {
            result.push(text.slice(lastIndex, start));
        }

        // Add highlighted text
        result.push(
            <mark key={`match-${i}`} className="search-highlight">
                {text.slice(start, end + 1)}
            </mark>
        );

        lastIndex = end + 1;
    });

    // Add remaining text
    if (lastIndex < text.length) {
        result.push(text.slice(lastIndex));
    }

    return <span>{result}</span>;
}

// Scoped styles for highlighting
// Note: We can add these to a global CSS later or use inline if simple
