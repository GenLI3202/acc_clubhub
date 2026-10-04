import { describe, expect, it } from 'vitest';

import {
    EMPTY_ORDER,
    addLine,
    codeFor,
    displayOptions,
    isReadyToPay,
    orderSignature,
    parseSavedOrder,
    removeLine,
    serializeOrder,
    setCurrency,
    setMembership,
    type OrderState,
} from '../orderState';
import { MAX_QTY_PER_LINE } from '../pricing';

const withJersey: OrderState = addLine(EMPTY_ORDER, { sku: 'jersey', size: 'M', qty: 1 });

describe('addLine', () => {
    it('adds a line without touching the previous state', () => {
        expect(EMPTY_ORDER.lines).toEqual([]);
        expect(withJersey.lines).toEqual([{ sku: 'jersey', size: 'M', qty: 1 }]);
    });

    it('merges the same SKU and size', () => {
        const twice = addLine(withJersey, { sku: 'jersey', size: 'M', qty: 2 });
        expect(twice.lines).toEqual([{ sku: 'jersey', size: 'M', qty: 3 }]);
    });

    it('caps a line at the per-line maximum instead of failing', () => {
        const capped = addLine(withJersey, { sku: 'jersey', size: 'M', qty: 99 });
        expect(capped.lines[0].qty).toBe(MAX_QTY_PER_LINE);
    });

    it('ignores a line that is not a positive whole number', () => {
        expect(addLine(EMPTY_ORDER, { sku: 'jersey', size: 'M', qty: 0 })).toBe(EMPTY_ORDER);
        expect(addLine(EMPTY_ORDER, { sku: 'jersey', size: 'M', qty: 1.5 })).toBe(EMPTY_ORDER);
    });
});

describe('removeLine', () => {
    it('removes only the matching SKU and size', () => {
        const two = addLine(withJersey, { sku: 'jersey', size: 'L', qty: 1 });
        expect(removeLine(two, 'jersey', 'M').lines).toEqual([
            { sku: 'jersey', size: 'L', qty: 1 },
        ]);
    });
});

describe('membership and currency', () => {
    it('start unchosen, so nobody pays the wrong price or method by default', () => {
        expect(EMPTY_ORDER.membership).toBeNull();
        expect(EMPTY_ORDER.currency).toBeNull();
    });

    it('can be chosen without mutating', () => {
        expect(setMembership(EMPTY_ORDER, 'member').membership).toBe('member');
        expect(setCurrency(EMPTY_ORDER, 'RMB').currency).toBe('RMB');
        expect(EMPTY_ORDER.membership).toBeNull();
    });
});

describe('displayOptions', () => {
    it('falls back to non-member / EUR only for showing prices', () => {
        expect(displayOptions(EMPTY_ORDER)).toEqual({ membership: 'non-member', currency: 'EUR' });
        expect(displayOptions(setCurrency(setMembership(EMPTY_ORDER, 'member'), 'RMB'))).toEqual({
            membership: 'member',
            currency: 'RMB',
        });
    });
});

describe('isReadyToPay', () => {
    const chosen = setCurrency(setMembership(withJersey, 'member'), 'EUR');

    it('needs at least one item, a membership and a payment method', () => {
        expect(isReadyToPay(chosen)).toBe(true);
        expect(isReadyToPay(withJersey)).toBe(false);
        expect(isReadyToPay(setMembership(withJersey, 'member'))).toBe(false);
        expect(isReadyToPay(setCurrency(withJersey, 'EUR'))).toBe(false);
        expect(isReadyToPay(setCurrency(setMembership(EMPTY_ORDER, 'member'), 'EUR'))).toBe(false);
    });
});

describe('order code', () => {
    const ready = (state: OrderState): OrderState =>
        setCurrency(setMembership(state, 'non-member'), 'EUR');

    it('is not issued until membership and payment method are chosen', () => {
        expect(codeFor(withJersey, () => 'ACC26-NOPE').code).toBeNull();
    });

    it('is reused while the order is unchanged and renewed when it changes', () => {
        let n = 0;
        const make = () => `ACC26-TEST${(n += 1)}`;

        const first = codeFor(ready(withJersey), make);
        expect(first.code?.value).toBe('ACC26-TEST1');

        const again = codeFor(first, make);
        expect(again.code?.value).toBe('ACC26-TEST1');

        const edited = codeFor(addLine(first, { sku: 'bib', size: 'M', qty: 1 }), make);
        expect(edited.code?.value).toBe('ACC26-TEST2');
    });

    it('is renewed when the currency or membership changes', () => {
        const make = () => 'ACC26-NEW1';
        const first = codeFor(ready(withJersey), () => 'ACC26-OLD1');
        expect(codeFor(setCurrency(first, 'RMB'), make).code?.value).toBe('ACC26-NEW1');
        expect(codeFor(setMembership(first, 'member'), make).code?.value).toBe('ACC26-NEW1');
    });
});

describe('orderSignature', () => {
    it('ignores line order but not content', () => {
        const a = addLine(withJersey, { sku: 'bib', size: 'M', qty: 1 });
        const b = addLine(
            addLine(EMPTY_ORDER, { sku: 'bib', size: 'M', qty: 1 }),
            { sku: 'jersey', size: 'M', qty: 1 },
        );
        expect(orderSignature(a)).toBe(orderSignature(b));
        expect(orderSignature(a)).not.toBe(orderSignature(withJersey));
    });
});

describe('saved order', () => {
    it('round-trips through serialize and parse', () => {
        const state = codeFor(
            setCurrency(
                setMembership(addLine(withJersey, { sku: 'vest-white', size: 'XL', qty: 2 }), 'member'),
                'RMB',
            ),
            () => 'ACC26-ABCD',
        );
        expect(parseSavedOrder(serializeOrder(state))).toEqual(state);
    });

    it('round-trips an order whose membership and payment method are still unchosen', () => {
        expect(parseSavedOrder(serializeOrder(withJersey))).toEqual(withJersey);
    });

    it.each([
        ['null', null],
        ['empty', ''],
        ['not JSON', '{oops'],
        ['wrong type', '"hello"'],
        ['unknown SKU', '{"lines":[{"sku":"cap","size":"M","qty":1}],"membership":"member","currency":"EUR"}'],
        ['bad size', '{"lines":[{"sku":"jersey","size":"XXS","qty":1}],"membership":"member","currency":"EUR"}'],
        ['bad quantity', '{"lines":[{"sku":"jersey","size":"M","qty":-2}],"membership":"member","currency":"EUR"}'],
        ['bad membership', '{"lines":[],"membership":"vip","currency":"EUR"}'],
    ])('rejects %s', (_label, raw) => {
        expect(parseSavedOrder(raw)).toBeNull();
    });

    it('drops a stored order code that does not match the stored order', () => {
        const state = codeFor(
            setCurrency(setMembership(withJersey, 'member'), 'EUR'),
            () => 'ACC26-ABCD',
        );
        const tampered = JSON.stringify({
            ...JSON.parse(serializeOrder(state)),
            lines: [{ sku: 'bib', size: 'S', qty: 1 }],
        });
        expect(parseSavedOrder(tampered)?.code).toBeNull();
    });
});
