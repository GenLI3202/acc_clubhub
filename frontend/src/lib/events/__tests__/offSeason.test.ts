import { describe, expect, it } from 'vitest';

import { locales } from '../../i18n';
import { getOffSeasonCopy, OFF_SEASON } from '../offSeason';

describe('getOffSeasonCopy', () => {
    it.each(locales)('%s has a title, a message and a label for every stat', (lang) => {
        const copy = getOffSeasonCopy(lang);
        expect(copy.title.length).toBeGreaterThan(0);
        expect(copy.body.length).toBeGreaterThan(40);
        expect(copy.statLabels).toHaveLength(OFF_SEASON.stats.length);
    });

    it('links the recap to the closing ride of the season', () => {
        expect(OFF_SEASON.recapSlug).toBe('acc-2026-season-closure-ride-2026-10-04');
    });

    it('falls back to Chinese for an unknown locale', () => {
        expect(getOffSeasonCopy('fr' as never).title).toBe(getOffSeasonCopy('zh').title);
    });
});
