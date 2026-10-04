// src/lib/uniform/pricing.ts
// 2026 kit order: catalog, prices, shipping tiers, order code and deadline.
//
// All money is integer minor units (EUR cents, RMB fen) so totals never pick
// up floating-point error. The order page, the Google Form prefill and the
// tests all go through this one module.

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
export type Size = (typeof SIZES)[number];

export type Currency = 'EUR' | 'RMB';
export type Membership = 'member' | 'non-member';
export type SkuId = 'jersey' | 'bib' | 'vest-white' | 'vest-black';
export type SkuCategory = 'jersey' | 'bib' | 'vest';

export interface Sku {
    readonly id: SkuId;
    /** Code written into the Google Form "order items" field. */
    readonly code: 'JERSEY' | 'BIB' | 'VEST-WHITE' | 'VEST-BLACK';
    readonly category: SkuCategory;
    readonly prices: Readonly<Record<Membership, Readonly<Record<Currency, number>>>>;
}

export interface OrderLine {
    readonly sku: SkuId;
    readonly size: Size;
    readonly qty: number;
}

export interface OrderTotals {
    readonly pieces: number;
    readonly subtotal: number;
    readonly shipping: number;
    readonly total: number;
    readonly currency: Currency;
}

const vestPrices = {
    member: { EUR: 3500, RMB: 26000 },
    'non-member': { EUR: 4000, RMB: 30000 },
} as const;

export const SKUS: readonly Sku[] = [
    {
        id: 'jersey',
        code: 'JERSEY',
        category: 'jersey',
        prices: {
            member: { EUR: 5250, RMB: 39000 },
            'non-member': { EUR: 5950, RMB: 45000 },
        },
    },
    {
        id: 'bib',
        code: 'BIB',
        category: 'bib',
        prices: {
            member: { EUR: 6000, RMB: 44500 },
            'non-member': { EUR: 6800, RMB: 51000 },
        },
    },
    { id: 'vest-white', code: 'VEST-WHITE', category: 'vest', prices: vestPrices },
    { id: 'vest-black', code: 'VEST-BLACK', category: 'vest', prices: vestPrices },
];

/** Most pieces one line may carry — a sanity cap, not a business rule. */
export const MAX_QTY_PER_LINE = 10;

/**
 * Orders close 25 Oct 2026, 23:59:59 Munich time. DST ends that very day
 * (03:00 CEST -> 02:00 CET), so 23:59 is already CET (UTC+1). A test pins
 * this against the Europe/Berlin zone so the offset can't silently drift.
 */
export const ORDER_DEADLINE = '2026-10-25T23:59:59+01:00';

const SHIPPING_PER_PIECE: Readonly<Record<Currency, number>> = { EUR: 150, RMB: 1200 };
const SHIPPING_SINGLE_PIECE: Readonly<Record<Currency, number>> = { EUR: 200, RMB: 1600 };

const SKU_BY_ID: ReadonlyMap<SkuId, Sku> = new Map(SKUS.map((s) => [s.id, s]));

function skuOf(id: SkuId): Sku {
    const sku = SKU_BY_ID.get(id);
    if (!sku) throw new RangeError(`Unknown SKU: ${String(id)}`);
    return sku;
}

function assertValidLine(line: OrderLine): void {
    skuOf(line.sku);
    if (!SIZES.includes(line.size)) {
        throw new RangeError(`Unknown size: ${String(line.size)}`);
    }
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_QTY_PER_LINE) {
        throw new RangeError(`Quantity must be a whole number from 1 to ${MAX_QTY_PER_LINE}`);
    }
}

/**
 * Transfer cost from China: a single piece costs 2 EUR / 16 RMB, from two
 * pieces on it is 1.5 EUR / 12 RMB for every piece. Pieces count across
 * all items.
 */
export function shippingFee(pieces: number, currency: Currency): number {
    if (pieces <= 0) return 0;
    if (pieces === 1) return SHIPPING_SINGLE_PIECE[currency];
    return pieces * SHIPPING_PER_PIECE[currency];
}

/** Collapses lines with the same SKU and size; first-seen order is kept. */
export function mergeLines(lines: readonly OrderLine[]): OrderLine[] {
    const merged = new Map<string, OrderLine>();
    for (const line of lines) {
        const key = `${line.sku}|${line.size}`;
        const existing = merged.get(key);
        merged.set(key, existing ? { ...existing, qty: existing.qty + line.qty } : { ...line });
    }
    return [...merged.values()];
}

export function computeTotals(
    lines: readonly OrderLine[],
    membership: Membership,
    currency: Currency,
): OrderTotals {
    lines.forEach(assertValidLine);
    const pieces = lines.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = lines.reduce(
        (sum, line) => sum + skuOf(line.sku).prices[membership][currency] * line.qty,
        0,
    );
    const shipping = shippingFee(pieces, currency);
    return { pieces, subtotal, shipping, total: subtotal + shipping, currency };
}

/** "CODE | SIZE | QTY" per line — the format the Google Form field expects. */
export function formatOrderItems(lines: readonly OrderLine[]): string {
    return mergeLines(lines)
        .map((line) => `${skuOf(line.sku).code} | ${line.size} | ${line.qty}`)
        .join('\n');
}

/** Plain number for the form: EUR with two decimals, whole RMB without. */
export function formatAmount(minorUnits: number, currency: Currency): string {
    const major = minorUnits / 100;
    return currency === 'EUR' || !Number.isInteger(major) ? major.toFixed(2) : String(major);
}

// No 0/O, 1/I/L: the code gets read aloud and typed into a bank transfer.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateOrderCode(random: () => number = Math.random): string {
    let suffix = '';
    for (let i = 0; i < 4; i += 1) {
        const index = Math.min(CODE_ALPHABET.length - 1, Math.floor(random() * CODE_ALPHABET.length));
        suffix += CODE_ALPHABET[index];
    }
    return `ACC26-${suffix}`;
}

export function isOrderClosed(now: Date = new Date()): boolean {
    return now.getTime() > new Date(ORDER_DEADLINE).getTime();
}
