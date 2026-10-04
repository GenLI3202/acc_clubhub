import { describe, expect, it } from 'vitest';

import {
    FORM_CONFIG,
    MEMBERSHIP_LABEL,
    PAYMENT_LABEL,
    buildPrefillUrl,
    isFormConfigured,
    type FormConfig,
} from '../form';
import type { OrderLine } from '../pricing';

const config: FormConfig = {
    viewformUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdummy/viewform',
    entries: {
        orderCode: '111',
        items: '222',
        pieces: '333',
        amount: '444',
        payment: '555',
        membership: '666',
    },
};

const lines: OrderLine[] = [
    { sku: 'jersey', size: 'M', qty: 1 },
    { sku: 'bib', size: 'M', qty: 1 },
];

describe('option labels', () => {
    it('match the option text the Google Form is created with', () => {
        expect(MEMBERSHIP_LABEL).toEqual({
            member: '会员 Member',
            'non-member': '非会员 Non-member',
        });
        expect(PAYMENT_LABEL).toEqual({
            RMB: 'Alipay (RMB)',
            EUR: 'SEPA transfer (EUR)',
        });
    });
});

describe('FORM_CONFIG', () => {
    it('is either not wired yet or completely valid — never half-pasted', () => {
        expect(FORM_CONFIG === null || isFormConfigured(FORM_CONFIG)).toBe(true);
    });
});

describe('isFormConfigured', () => {
    it('is false until a Google Form is wired in', () => {
        expect(isFormConfigured(null)).toBe(false);
    });

    it('requires a Google Forms URL and numeric entry ids', () => {
        expect(isFormConfigured(config)).toBe(true);
        expect(isFormConfigured({ ...config, viewformUrl: 'https://example.com/form' })).toBe(false);
        expect(
            isFormConfigured({ ...config, entries: { ...config.entries, items: 'abc' } }),
        ).toBe(false);
    });
});

describe('buildPrefillUrl', () => {
    it('fills every order field for a member paying in EUR', () => {
        const url = new URL(
            buildPrefillUrl(config, {
                code: 'ACC26-7K4Q',
                lines,
                membership: 'member',
                currency: 'EUR',
            }),
        );
        expect(url.origin + url.pathname).toBe(config.viewformUrl);
        expect(url.searchParams.get('usp')).toBe('pp_url');
        expect(url.searchParams.get('entry.111')).toBe('ACC26-7K4Q');
        expect(url.searchParams.get('entry.222')).toBe('JERSEY | M | 1\nBIB | M | 1');
        expect(url.searchParams.get('entry.333')).toBe('2');
        expect(url.searchParams.get('entry.444')).toBe('115.50');
        expect(url.searchParams.get('entry.555')).toBe('SEPA transfer (EUR)');
        expect(url.searchParams.get('entry.666')).toBe('会员 Member');
    });

    it('fills a non-member paying in RMB', () => {
        const url = new URL(
            buildPrefillUrl(config, {
                code: 'ACC26-ABCD',
                lines,
                membership: 'non-member',
                currency: 'RMB',
            }),
        );
        // 450 + 510 + 2 pieces x 12 shipping
        expect(url.searchParams.get('entry.444')).toBe('984');
        expect(url.searchParams.get('entry.555')).toBe('Alipay (RMB)');
        expect(url.searchParams.get('entry.666')).toBe('非会员 Non-member');
    });

    it('adds embedded=true only when asked', () => {
        const order = { code: 'ACC26-ABCD', lines, membership: 'member', currency: 'EUR' } as const;
        expect(new URL(buildPrefillUrl(config, order)).searchParams.has('embedded')).toBe(false);
        expect(
            new URL(buildPrefillUrl(config, order, { embedded: true })).searchParams.get('embedded'),
        ).toBe('true');
    });

    it('refuses an empty order', () => {
        expect(() =>
            buildPrefillUrl(config, {
                code: 'ACC26-ABCD',
                lines: [],
                membership: 'member',
                currency: 'EUR',
            }),
        ).toThrow(RangeError);
    });
});
