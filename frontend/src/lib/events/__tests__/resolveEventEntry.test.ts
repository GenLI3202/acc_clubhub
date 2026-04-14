/**
 * Tests for event entry resolution by lang + slug.
 * Covers issue #93: event detail page always served wrong language.
 */

import { describe, it, expect } from 'vitest';

type MockEntry = { id: string; data: { slug: string } };

/** Mirrors the resolution logic in [slug].astro */
function resolveEventEntry(
    allEvents: MockEntry[],
    slug: string,
    lang: string,
): MockEntry | undefined {
    return (
        allEvents.find((e) => e.data.slug === slug && e.id.startsWith(`${lang}/`)) ??
        allEvents.find((e) => e.data.slug === slug && e.id.startsWith('zh/'))
    );
}

const mockEvents: MockEntry[] = [
    { id: 'zh/2026-acc-season-opening.md', data: { slug: '2026-acc-season-opening' } },
    { id: 'en/2026-acc-season-opening.md', data: { slug: '2026-acc-season-opening' } },
    { id: 'de/2026-acc-season-opening.md', data: { slug: '2026-acc-season-opening' } },
    { id: 'zh/other-event.md', data: { slug: 'other-event' } },
];

describe('resolveEventEntry', () => {
    it('returns zh entry for lang=zh', () => {
        const entry = resolveEventEntry(mockEvents, '2026-acc-season-opening', 'zh');
        expect(entry?.id).toBe('zh/2026-acc-season-opening.md');
    });

    it('returns en entry for lang=en', () => {
        const entry = resolveEventEntry(mockEvents, '2026-acc-season-opening', 'en');
        expect(entry?.id).toBe('en/2026-acc-season-opening.md');
    });

    it('returns de entry for lang=de', () => {
        const entry = resolveEventEntry(mockEvents, '2026-acc-season-opening', 'de');
        expect(entry?.id).toBe('de/2026-acc-season-opening.md');
    });

    it('falls back to zh when requested lang version does not exist', () => {
        const zhOnly: MockEntry[] = [
            { id: 'zh/2026-acc-season-opening.md', data: { slug: '2026-acc-season-opening' } },
        ];
        const entry = resolveEventEntry(zhOnly, '2026-acc-season-opening', 'en');
        expect(entry?.id).toBe('zh/2026-acc-season-opening.md');
    });

    it('returns undefined for unknown slug', () => {
        const entry = resolveEventEntry(mockEvents, 'does-not-exist', 'zh');
        expect(entry).toBeUndefined();
    });

    it('does not confuse entries with different slugs', () => {
        const entry = resolveEventEntry(mockEvents, 'other-event', 'en');
        // no en version exists, falls back to zh
        expect(entry?.id).toBe('zh/other-event.md');
    });
});
