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

/** Question ids of the "ACC 2026 队服订购 / Kit Order" Google Form (read from its preview). */
const FORM_ENTRIES: FormConfig['entries'] = {
    orderCode: '1557806289',
    items: '1053998814',
    pieces: '1527366407',
    amount: '1708418500',
    payment: '2070385535',
    membership: '425611584',
};

/**
 * The form's public responder link, `https://docs.google.com/forms/d/e/<id>/viewform`
 * (it exists once the form is published). Set this back to null to put
 * checkout on hold: the order page then locks "pay" in production and shows
 * a "form being prepared" notice.
 */
const FORM_VIEWFORM_URL: string | null =
    'https://docs.google.com/forms/d/e/1FAIpQLSeJNy9Xupq8tcjuVrprbjASzmNwdmHM6UGMxOD0si4egvOTPw/viewform';

export const FORM_CONFIG: FormConfig | null = FORM_VIEWFORM_URL
    ? { viewformUrl: FORM_VIEWFORM_URL, entries: FORM_ENTRIES }
    : null;

const FORM_URL_PATTERN = /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/viewform$/;

export function isFormConfigured(config: FormConfig | null): config is FormConfig {
    if (!config || !FORM_URL_PATTERN.test(config.viewformUrl)) return false;
    return Object.values(config.entries).every((id) => /^\d+$/.test(id));
}

/**
 * Link that opens the Form with the order already filled in. It opens in its
 * own tab: a Form with a file upload cannot be embedded in a page (Google
 * shows only a title card and a "Fill out form" button instead of the
 * questions), and the upload needs a Google sign-in anyway.
 */
export function buildPrefillUrl(config: FormConfig, order: PrefillOrder): string {
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
    return `${config.viewformUrl}?${params.toString()}`;
}
