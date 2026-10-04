// src/lib/uniform/form.ts
// Google Form wiring for the kit order: option labels and the pre-filled link.
//
// The labels must match, character for character, the option text the Form
// was created with — Google only pre-selects a choice on an exact match.

import {
    computeTotals,
    formatAmount,
    formatOrderItems,
    type Currency,
    type Membership,
    type OrderLine,
} from './pricing';

export const MEMBERSHIP_LABEL: Readonly<Record<Membership, string>> = {
    member: '会员 Member',
    'non-member': '非会员 Non-member',
};

export const PAYMENT_LABEL: Readonly<Record<Currency, string>> = {
    RMB: 'Alipay (RMB)',
    EUR: 'SEPA transfer (EUR)',
};

export type FormField = 'orderCode' | 'items' | 'pieces' | 'amount' | 'payment' | 'membership';

export interface FormConfig {
    /** The Form's public `.../viewform` URL, without a query string. */
    readonly viewformUrl: string;
    /** Numeric id after `entry.` in the Form's "Get pre-filled link" URL. */
    readonly entries: Readonly<Record<FormField, string>>;
}

export interface PrefillOrder {
    readonly code: string;
    readonly lines: readonly OrderLine[];
    readonly membership: Membership;
    readonly currency: Currency;
}

/**
 * Set once the Google Form exists: paste its viewform URL and the six entry
 * ids from "Get pre-filled link". While this is null the order page shows a
 * "form opening soon" notice instead of the embedded form.
 */
export const FORM_CONFIG: FormConfig | null = null;

const FORM_URL_PATTERN = /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/viewform$/;

export function isFormConfigured(config: FormConfig | null): config is FormConfig {
    if (!config || !FORM_URL_PATTERN.test(config.viewformUrl)) return false;
    return Object.values(config.entries).every((id) => /^\d+$/.test(id));
}

export function buildPrefillUrl(
    config: FormConfig,
    order: PrefillOrder,
    options: { embedded?: boolean } = {},
): string {
    if (order.lines.length === 0) {
        throw new RangeError('Cannot pre-fill the form for an empty order');
    }
    const totals = computeTotals(order.lines, order.membership, order.currency);
    const values: Readonly<Record<FormField, string>> = {
        orderCode: order.code,
        items: formatOrderItems(order.lines),
        pieces: String(totals.pieces),
        amount: formatAmount(totals.total, order.currency),
        payment: PAYMENT_LABEL[order.currency],
        membership: MEMBERSHIP_LABEL[order.membership],
    };

    const params = new URLSearchParams({ usp: 'pp_url' });
    for (const field of Object.keys(values) as FormField[]) {
        params.set(`entry.${config.entries[field]}`, values[field]);
    }
    if (options.embedded) params.set('embedded', 'true');
    return `${config.viewformUrl}?${params.toString()}`;
}
