import { describe, expect, it } from 'vitest';

import {
    CUT_LABEL,
    FORM_CONFIG,
    MEMBERSHIP_LABEL,
    PAYMENT_LABEL,
    VEST_COLOR_LABEL,
    buildPrefillUrl,
    isFormConfigured,
    splitOrderLines,
    type FormConfig,
} from '../form';
import type { Currency, Membership, OrderLine } from '../pricing';

const config: FormConfig = {
    viewformUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdummy/viewform',
    entries: {
        orderCode: '101',
        amount: '102',
        payment: '103',
        membership: '104',
        extras: '105',
        name: '106',
        email: '107',
        phone: '108',
        wechat: '109',
        jerseyCut: '111',
        jerseySize: '112',
        jerseyQty: '113',
        bibCut: '121',
        bibSize: '122',
        bibQty: '123',
        vestCut: '131',
        vestColor: '132',
        vestSize: '133',
        vestQty: '134',
    },
};

const oneOfEach: OrderLine[] = [
    { sku: 'jersey', cut: 'men', size: 'M', qty: 1 },
    { sku: 'bib', cut: 'women', size: 'S', qty: 2 },
    { sku: 'vest-white', cut: 'men', size: 'L', qty: 1 },
];

interface OrderBase {
    code: string;
    membership: Membership;
    currency: Currency;
}

const base: OrderBase = { code: 'ACC26-ABCD', membership: 'member', currency: 'EUR' };

function paramsFor(lines: OrderLine[], overrides: Partial<OrderBase> = {}) {
    const url = new URL(buildPrefillUrl(config, { ...base, ...overrides, lines }));
    return url.searchParams;
}

describe('option labels', () => {
    it('match the option text the Google Form is created with', () => {
        expect(MEMBERSHIP_LABEL).toEqual({
            core: '核心队员 Core member',
            member: '会员 Member',
            'non-member': '非会员 Non-member',
        });
        expect(PAYMENT_LABEL).toEqual({
            RMB: 'Alipay (RMB)',
            EUR: 'SEPA transfer (EUR)',
        });
    });

    it('use the same words as the internal order sheet for cut and vest colour', () => {
        expect(CUT_LABEL).toEqual({ men: '男款', women: '女款' });
        expect(VEST_COLOR_LABEL).toEqual({ 'vest-white': '白色', 'vest-black': '黑色' });
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

    it('requires a Google Forms URL and numeric entry ids for every field', () => {
        expect(isFormConfigured(config)).toBe(true);
        expect(isFormConfigured({ ...config, viewformUrl: 'https://example.com/form' })).toBe(false);
        expect(
            isFormConfigured({ ...config, entries: { ...config.entries, jerseySize: 'abc' } }),
        ).toBe(false);
        expect(isFormConfigured({ ...config, entries: { ...config.entries, extras: '' } })).toBe(false);
    });
});

describe('splitOrderLines', () => {
    it('puts the first line of each item into its columns and the rest into extras', () => {
        const { primary, extras } = splitOrderLines([
            { sku: 'jersey', cut: 'men', size: 'M', qty: 1 },
            { sku: 'jersey', cut: 'women', size: 'L', qty: 1 },
            { sku: 'vest-white', cut: 'men', size: 'L', qty: 1 },
            { sku: 'vest-black', cut: 'men', size: 'M', qty: 1 },
        ]);
        expect(primary.jersey).toEqual({ sku: 'jersey', cut: 'men', size: 'M', qty: 1 });
        expect(primary.vest).toEqual({ sku: 'vest-white', cut: 'men', size: 'L', qty: 1 });
        expect(primary.bib).toBeUndefined();
        expect(extras).toEqual([
            { sku: 'jersey', cut: 'women', size: 'L', qty: 1 },
            { sku: 'vest-black', cut: 'men', size: 'M', qty: 1 },
        ]);
    });

    it('has no extras when each item appears once', () => {
        expect(splitOrderLines(oneOfEach).extras).toEqual([]);
    });
});

describe('buildPrefillUrl', () => {
    it('fills the sheet columns for one of each item (member, EUR)', () => {
        const p = paramsFor(oneOfEach);
        expect(p.get('usp')).toBe('pp_url');
        expect(p.get('entry.101')).toBe('ACC26-ABCD');
        // 52.50 + 2 x 60.00 + 35.00 + 4 pieces x 1.50 shipping
        expect(p.get('entry.102')).toBe('213.50');
        expect(p.get('entry.103')).toBe('SEPA transfer (EUR)');
        expect(p.get('entry.104')).toBe('会员 Member');

        expect(p.get('entry.111')).toBe('男款');
        expect(p.get('entry.112')).toBe('M');
        expect(p.get('entry.113')).toBe('1');

        expect(p.get('entry.121')).toBe('女款');
        expect(p.get('entry.122')).toBe('S');
        expect(p.get('entry.123')).toBe('2');

        expect(p.get('entry.131')).toBe('男款');
        expect(p.get('entry.132')).toBe('白色');
        expect(p.get('entry.133')).toBe('L');
        expect(p.get('entry.134')).toBe('1');
    });

    it('leaves out the columns of items that are not ordered', () => {
        const p = paramsFor([{ sku: 'jersey', cut: 'men', size: 'XL', qty: 1 }]);
        expect(p.get('entry.112')).toBe('XL');
        expect(p.has('entry.121')).toBe(false);
        expect(p.has('entry.122')).toBe(false);
        expect(p.has('entry.132')).toBe(false);
        expect(p.has('entry.105')).toBe(false);
    });

    it('writes a second size or a second vest colour into the "other sizes" field', () => {
        const p = paramsFor([
            { sku: 'jersey', cut: 'men', size: 'M', qty: 1 },
            { sku: 'jersey', cut: 'women', size: 'L', qty: 1 },
            { sku: 'vest-white', cut: 'men', size: 'L', qty: 1 },
            { sku: 'vest-black', cut: 'men', size: 'M', qty: 2 },
        ]);
        expect(p.get('entry.112')).toBe('M');
        expect(p.get('entry.132')).toBe('白色');
        expect(p.get('entry.105')).toBe('分体上衣 | 女款 | L | 1\n马甲 | 男款 | 黑色 M | 2');
    });

    it('fills a core member paying in EUR', () => {
        const p = paramsFor(
            [
                { sku: 'jersey', cut: 'men', size: 'M', qty: 1 },
                { sku: 'bib', cut: 'men', size: 'M', qty: 1 },
            ],
            { membership: 'core', currency: 'EUR', code: 'ACC26-CORE' },
        );
        // 45 + 51 + 2 pieces x 1.50 shipping
        expect(p.get('entry.102')).toBe('99.00');
        expect(p.get('entry.104')).toBe('核心队员 Core member');
    });

    it('fills the contact details when given', () => {
        const url = new URL(
            buildPrefillUrl(config, {
                ...base,
                lines: oneOfEach,
                contact: { name: 'Li Wei', email: 'li@example.com', phone: '+49 170 1234567', wechat: 'liwei' },
            }),
        );
        expect(url.searchParams.get('entry.106')).toBe('Li Wei');
        expect(url.searchParams.get('entry.107')).toBe('li@example.com');
        expect(url.searchParams.get('entry.108')).toBe('+49 170 1234567');
        expect(url.searchParams.get('entry.109')).toBe('liwei');
    });

    it('leaves the WeChat field out when it is empty, and all contact fields without a contact', () => {
        const withEmptyWechat = new URL(
            buildPrefillUrl(config, {
                ...base,
                lines: oneOfEach,
                contact: { name: 'Li Wei', email: 'li@example.com', phone: '+49 1', wechat: '' },
            }),
        );
        expect(withEmptyWechat.searchParams.has('entry.109')).toBe(false);
        expect(withEmptyWechat.searchParams.get('entry.106')).toBe('Li Wei');
        const without = paramsFor(oneOfEach);
        for (const id of ['106', '107', '108', '109']) expect(without.has(`entry.${id}`)).toBe(false);
    });

    it('fills a non-member paying in RMB', () => {
        const p = paramsFor(
            [
                { sku: 'jersey', cut: 'men', size: 'M', qty: 1 },
                { sku: 'bib', cut: 'men', size: 'M', qty: 1 },
            ],
            { membership: 'non-member', currency: 'RMB', code: 'ACC26-WXYZ' },
        );
        // 450 + 510 + 2 pieces x 12 shipping
        expect(p.get('entry.102')).toBe('984');
        expect(p.get('entry.103')).toBe('Alipay (RMB)');
        expect(p.get('entry.104')).toBe('非会员 Non-member');
        expect(p.get('entry.101')).toBe('ACC26-WXYZ');
    });

    it('refuses an empty order', () => {
        expect(() => buildPrefillUrl(config, { ...base, lines: [] })).toThrow(RangeError);
    });
});
