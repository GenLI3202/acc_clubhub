import { describe, expect, it } from 'vitest';

import {
    ORDER_DEADLINE,
    SIZES,
    SKUS,
    computeTotals,
    formatAmount,
    formatOrderItems,
    generateOrderCode,
    isOrderClosed,
    mergeLines,
    shippingFee,
    type OrderLine,
} from '../pricing';

const jerseyM: OrderLine = { sku: 'jersey', size: 'M', qty: 1 };
const bibM: OrderLine = { sku: 'bib', size: 'M', qty: 1 };

describe('catalog', () => {
    it('lists the four SKUs with their order codes', () => {
        expect(SKUS.map((s) => s.code)).toEqual([
            'JERSEY',
            'BIB',
            'VEST-WHITE',
            'VEST-BLACK',
        ]);
    });

    it('opens XS to 3XL only', () => {
        expect(SIZES).toEqual(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']);
    });
});

describe('shippingFee', () => {
    it('charges nothing for an empty order', () => {
        expect(shippingFee(0, 'EUR')).toBe(0);
        expect(shippingFee(0, 'RMB')).toBe(0);
    });

    it('charges 2 EUR / 16 RMB for a single piece', () => {
        expect(shippingFee(1, 'EUR')).toBe(200);
        expect(shippingFee(1, 'RMB')).toBe(1600);
    });

    it('charges 1.5 EUR / 12 RMB per piece from two pieces', () => {
        expect(shippingFee(2, 'EUR')).toBe(300);
        expect(shippingFee(2, 'RMB')).toBe(2400);
        expect(shippingFee(5, 'EUR')).toBe(750);
        expect(shippingFee(5, 'RMB')).toBe(6000);
    });
});

describe('computeTotals', () => {
    it('prices a member jersey + bib in EUR (the agreed example: 115.50)', () => {
        const totals = computeTotals([jerseyM, bibM], 'member', 'EUR');
        expect(totals).toEqual({
            pieces: 2,
            subtotal: 11250,
            shipping: 300,
            total: 11550,
            currency: 'EUR',
        });
        expect(formatAmount(totals.total, 'EUR')).toBe('115.50');
    });

    it('prices a member jersey + bib in RMB (the agreed example: 859)', () => {
        const totals = computeTotals([jerseyM, bibM], 'member', 'RMB');
        expect(totals.subtotal).toBe(83500);
        expect(totals.shipping).toBe(2400);
        expect(formatAmount(totals.total, 'RMB')).toBe('859');
    });

    it('uses the non-member price list', () => {
        const lines: OrderLine[] = [
            { sku: 'jersey', size: 'L', qty: 1 },
            { sku: 'bib', size: 'L', qty: 1 },
            { sku: 'vest-white', size: 'L', qty: 1 },
        ];
        const eur = computeTotals(lines, 'non-member', 'EUR');
        expect(eur.subtotal).toBe(5950 + 6800 + 4000);
        const rmb = computeTotals(lines, 'non-member', 'RMB');
        expect(rmb.subtotal).toBe(45000 + 51000 + 30000);
    });

    it('prices both vest colours the same', () => {
        const white = computeTotals(
            [{ sku: 'vest-white', size: 'M', qty: 1 }],
            'member',
            'EUR',
        );
        const black = computeTotals(
            [{ sku: 'vest-black', size: 'M', qty: 1 }],
            'member',
            'EUR',
        );
        expect(white.subtotal).toBe(3500);
        expect(black.subtotal).toBe(3500);
        expect(white.total).toBe(3700);
    });

    it('counts pieces across all items for the shipping tier', () => {
        const totals = computeTotals(
            [{ sku: 'jersey', size: 'S', qty: 2 }, { sku: 'vest-black', size: 'S', qty: 1 }],
            'member',
            'EUR',
        );
        expect(totals.pieces).toBe(3);
        expect(totals.shipping).toBe(450);
    });

    it('returns zeros for an empty order', () => {
        expect(computeTotals([], 'member', 'EUR').total).toBe(0);
    });

    it('rejects a quantity that is not a positive integer', () => {
        expect(() =>
            computeTotals([{ sku: 'jersey', size: 'M', qty: 0 }], 'member', 'EUR'),
        ).toThrow(RangeError);
        expect(() =>
            computeTotals([{ sku: 'jersey', size: 'M', qty: 1.5 }], 'member', 'EUR'),
        ).toThrow(RangeError);
    });

    it('rejects an unknown size or SKU', () => {
        expect(() =>
            computeTotals(
                [{ sku: 'jersey', size: 'XXS' as never, qty: 1 }],
                'member',
                'EUR',
            ),
        ).toThrow(RangeError);
        expect(() =>
            computeTotals([{ sku: 'cap' as never, size: 'M', qty: 1 }], 'member', 'EUR'),
        ).toThrow(RangeError);
    });
});

describe('mergeLines', () => {
    it('adds quantities of the same SKU and size, keeping first-seen order', () => {
        const merged = mergeLines([
            { sku: 'jersey', size: 'M', qty: 1 },
            { sku: 'bib', size: 'M', qty: 1 },
            { sku: 'jersey', size: 'M', qty: 2 },
            { sku: 'jersey', size: 'L', qty: 1 },
        ]);
        expect(merged).toEqual([
            { sku: 'jersey', size: 'M', qty: 3 },
            { sku: 'bib', size: 'M', qty: 1 },
            { sku: 'jersey', size: 'L', qty: 1 },
        ]);
    });

    it('does not mutate its input', () => {
        const input: OrderLine[] = [
            { sku: 'jersey', size: 'M', qty: 1 },
            { sku: 'jersey', size: 'M', qty: 1 },
        ];
        mergeLines(input);
        expect(input[0].qty).toBe(1);
    });
});

describe('formatOrderItems', () => {
    it('writes one "CODE | SIZE | QTY" line per merged item', () => {
        expect(
            formatOrderItems([
                jerseyM,
                { sku: 'vest-white', size: '2XL', qty: 2 },
                { sku: 'jersey', size: 'M', qty: 1 },
            ]),
        ).toBe('JERSEY | M | 2\nVEST-WHITE | 2XL | 2');
    });
});

describe('formatAmount', () => {
    it('shows EUR with two decimals and whole RMB without decimals', () => {
        expect(formatAmount(5250, 'EUR')).toBe('52.50');
        expect(formatAmount(200, 'EUR')).toBe('2.00');
        expect(formatAmount(39000, 'RMB')).toBe('390');
    });
});

describe('generateOrderCode', () => {
    it('builds ACC26- plus four unambiguous characters', () => {
        const code = generateOrderCode(() => 0.5);
        expect(code).toMatch(/^ACC26-[A-HJ-NP-Z2-9]{4}$/);
    });

    it('is deterministic for a given random source', () => {
        expect(generateOrderCode(() => 0)).toBe(generateOrderCode(() => 0));
    });

    it('never emits look-alike characters', () => {
        for (let i = 0; i < 200; i += 1) {
            const suffix = generateOrderCode().slice('ACC26-'.length);
            expect(suffix).not.toMatch(/[01OIL]/);
        }
    });
});

describe('order deadline', () => {
    it('is 25 Oct 2026 23:59:59 Munich time (CET, DST has just ended)', () => {
        const munich = new Date(ORDER_DEADLINE).toLocaleString('sv-SE', {
            timeZone: 'Europe/Berlin',
        });
        expect(munich).toBe('2026-10-25 23:59:59');
    });

    it('is open up to the last second and closed right after', () => {
        expect(isOrderClosed(new Date('2026-10-25T22:59:59Z'))).toBe(false);
        expect(isOrderClosed(new Date('2026-10-25T23:00:00Z'))).toBe(true);
    });

    it('is open well before the deadline', () => {
        expect(isOrderClosed(new Date('2026-10-05T12:00:00Z'))).toBe(false);
    });
});
