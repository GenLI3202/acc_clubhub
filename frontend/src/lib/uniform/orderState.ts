// src/lib/uniform/orderState.ts
// The buyer's in-progress order: pure transitions plus (de)serialisation, so
// the Preact island stays thin and a refresh does not lose the basket.

import {
    MAX_QTY_PER_LINE,
    SIZES,
    SKUS,
    mergeLines,
    type Currency,
    type Membership,
    type OrderLine,
    type Size,
    type SkuId,
} from './pricing';

/** An order code is only valid for the exact order it was issued for. */
export interface OrderCode {
    readonly value: string;
    readonly signature: string;
}

export interface OrderState {
    readonly lines: readonly OrderLine[];
    readonly membership: Membership;
    readonly currency: Currency;
    readonly code: OrderCode | null;
}

export const EMPTY_ORDER: OrderState = {
    lines: [],
    membership: 'non-member',
    currency: 'EUR',
    code: null,
};

const SKU_IDS: readonly string[] = SKUS.map((sku) => sku.id);
const MEMBERSHIPS: readonly Membership[] = ['member', 'non-member'];
const CURRENCIES: readonly Currency[] = ['EUR', 'RMB'];

function isValidLine(line: OrderLine): boolean {
    return (
        SKU_IDS.includes(line.sku) &&
        SIZES.includes(line.size) &&
        Number.isInteger(line.qty) &&
        line.qty >= 1
    );
}

export function addLine(state: OrderState, line: OrderLine): OrderState {
    if (!isValidLine(line)) return state;
    const lines = mergeLines([...state.lines, line]).map((merged) => ({
        ...merged,
        qty: Math.min(merged.qty, MAX_QTY_PER_LINE),
    }));
    return { ...state, lines };
}

export function removeLine(state: OrderState, sku: SkuId, size: Size): OrderState {
    return {
        ...state,
        lines: state.lines.filter((line) => !(line.sku === sku && line.size === size)),
    };
}

export function setMembership(state: OrderState, membership: Membership): OrderState {
    return { ...state, membership };
}

export function setCurrency(state: OrderState, currency: Currency): OrderState {
    return { ...state, currency };
}

/** Same for the same order, whatever order the lines were added in. */
export function orderSignature(state: OrderState): string {
    const items = state.lines
        .map((line) => `${line.sku}:${line.size}:${line.qty}`)
        .sort()
        .join(',');
    return `${state.membership}|${state.currency}|${items}`;
}

/** Keeps the current code while the order is unchanged, otherwise issues a new one. */
export function codeFor(state: OrderState, makeCode: () => string): OrderState {
    const signature = orderSignature(state);
    if (state.code?.signature === signature) return state;
    return { ...state, code: { value: makeCode(), signature } };
}

export function serializeOrder(state: OrderState): string {
    return JSON.stringify({
        lines: state.lines,
        membership: state.membership,
        currency: state.currency,
        code: state.code,
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLine(value: unknown): OrderLine | null {
    if (!isRecord(value)) return null;
    const line = value as unknown as OrderLine;
    return isValidLine(line) && line.qty <= MAX_QTY_PER_LINE
        ? { sku: line.sku, size: line.size, qty: line.qty }
        : null;
}

/** Returns null for anything that is not a well-formed saved order. */
export function parseSavedOrder(raw: string | null): OrderState | null {
    if (!raw) return null;
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!isRecord(data) || !Array.isArray(data.lines)) return null;

    const lines = data.lines.map(parseLine);
    if (lines.some((line) => line === null)) return null;
    const membership = data.membership as Membership;
    const currency = data.currency as Currency;
    if (!MEMBERSHIPS.includes(membership) || !CURRENCIES.includes(currency)) return null;

    const base: OrderState = {
        lines: lines as OrderLine[],
        membership,
        currency,
        code: null,
    };

    const saved = data.code;
    if (
        isRecord(saved) &&
        typeof saved.value === 'string' &&
        /^ACC26-[A-Z0-9]{4}$/.test(saved.value) &&
        saved.signature === orderSignature(base)
    ) {
        return { ...base, code: { value: saved.value, signature: saved.signature } };
    }
    return base;
}
