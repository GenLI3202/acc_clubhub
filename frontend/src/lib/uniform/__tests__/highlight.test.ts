import { describe, expect, it } from 'vitest';

import { splitAtPhrase } from '../highlight';

describe('splitAtPhrase', () => {
    it('cuts the text around the phrase', () => {
        expect(splitAtPhrase('一句话：愿平安。完', '愿平安。')).toEqual({
            before: '一句话：',
            match: '愿平安。',
            after: '完',
        });
    });

    it('only marks the first occurrence', () => {
        expect(splitAtPhrase('a b a', 'a')).toEqual({ before: '', match: 'a', after: ' b a' });
    });

    it('returns null when the phrase is not in the text', () => {
        expect(splitAtPhrase('nothing here', 'missing')).toBeNull();
    });

    it('returns null for an empty phrase', () => {
        expect(splitAtPhrase('text', '')).toBeNull();
    });
});
