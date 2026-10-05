import { describe, expect, it } from 'vitest';

import { fill, getUniformCopy } from '../copy';
import { locales } from '../../i18n';

describe('getUniformCopy', () => {
    it('returns copy for every site locale', () => {
        for (const lang of locales) {
            expect(getUniformCopy(lang).hero.title.length).toBeGreaterThan(0);
        }
    });

    it('falls back to Chinese for an unknown locale', () => {
        expect(getUniformCopy('fr' as never).hero.title).toBe(getUniformCopy('zh').hero.title);
    });

    it.each(locales)('%s has the same list lengths as the Chinese copy', (lang) => {
        const base = getUniformCopy('zh');
        const copy = getUniformCopy(lang);
        expect(copy.hero.timeline).toHaveLength(base.hero.timeline.length);
        expect(copy.story.opening).toHaveLength(base.story.opening.length);
        expect(copy.story.middle).toHaveLength(base.story.middle.length);
        expect(copy.story.closing).toHaveLength(base.story.closing.length);
        expect(copy.story.symbols.map((s) => s.key)).toEqual(base.story.symbols.map((s) => s.key));
        expect(copy.story.details).toHaveLength(base.story.details.length);
        expect(copy.terms.items).toHaveLength(base.terms.items.length);
        for (const category of ['jersey', 'bib', 'vest'] as const) {
            expect(copy.shop.products[category].bullets).toHaveLength(
                base.shop.products[category].bullets.length,
            );
        }
    });

    it.each(locales)('%s tells the whole design story', (lang) => {
        const { story } = getUniformCopy(lang);
        expect(story.opening.length).toBeGreaterThan(0);
        expect(story.middle.length).toBeGreaterThan(0);
        expect(story.closing.length).toBeGreaterThan(0);
        expect(story.symbolsIntro.length).toBeGreaterThan(0);
        // The two meanings the club asked to keep: the 平安 wish and the club name.
        expect(story.middle.join(' ')).toContain('平安');
        expect(story.closing.join(' ')).toMatch(/Across Paths/);
    });

    it.each(locales)('%s keeps the placeholders its UI code fills in', (lang) => {
        const copy = getUniformCopy(lang);
        expect(copy.summary.pieces).toContain('{n}');
        expect(copy.summary.transferHint).toContain('{single}');
        expect(copy.summary.transferHint).toContain('{each}');
        expect(copy.sizes.result).toContain('{size}');
    });

    it.each(locales)('%s states the deadline, the pick-up rule and the sample notice', (lang) => {
        const copy = getUniformCopy(lang);
        expect(copy.hero.deadline).toMatch(/25/);
        expect(copy.hero.deadline).toMatch(/23:59/);
        expect(copy.story.sampleText.length).toBeGreaterThan(40);
        expect(copy.terms.items.join(' ')).toMatch(/GRC/);
    });
});

describe('fill', () => {
    it('replaces every named placeholder', () => {
        expect(fill('{n} pcs, {n} total, {size}', { n: 2, size: 'M' })).toBe('2 pcs, 2 total, M');
    });

    it('leaves unknown placeholders untouched', () => {
        expect(fill('{a} {b}', { a: 'x' })).toBe('x {b}');
    });
});
