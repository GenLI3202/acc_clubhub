// src/lib/uniform/form.ts
// Google Form wiring for the kit order: option labels and the pre-filled link.
//
// The Form's columns mirror the internal GRC order sheet: per item a cut
// (男款/女款), a size and a quantity, plus the vest colour. Anything that does
// not fit one set of columns — a second size of the same item, or a second
// vest colour — goes into one "other sizes" text field for staff to add by
// hand, exactly like the notes column of the internal sheet.
//
// Option labels must match, character for character, the option text the
// Form was created with: Google only pre-selects a choice on an exact match.

import {
    SKUS,
    computeTotals,
    formatAmount,
    type Currency,
    type Cut,
    type Membership,
    type OrderLine,
    type SkuCategory,
    type SkuId,
} from './pricing';

export const MEMBERSHIP_LABEL: Readonly<Record<Membership, string>> = {
    core: '核心队员 Core member',
    member: '会员 Member',
    'non-member': '非会员 Non-member',
};

export const PAYMENT_LABEL: Readonly<Record<Currency, string>> = {
    RMB: 'Alipay (RMB)',
    EUR: 'SEPA transfer (EUR)',
};

/** Same words as the internal order sheet, so counts and COUNTIFS keep working. */
export const CUT_LABEL: Readonly<Record<Cut, string>> = {
    men: '男款',
    women: '女款',
};

export const VEST_COLOR_LABEL: Readonly<Record<'vest-white' | 'vest-black', string>> = {
    'vest-white': '白色',
    'vest-black': '黑色',
};

const ITEM_NAME: Readonly<Record<SkuCategory, string>> = {
    jersey: '分体上衣',
    bib: '分体裤',
    vest: '马甲',
};

export type FormField =
    | 'orderCode'
    | 'amount'
    | 'payment'
    | 'membership'
    | 'extras'
    | 'jerseyCut'
    | 'jerseySize'
    | 'jerseyQty'
    | 'bibCut'
    | 'bibSize'
    | 'bibQty'
    | 'vestCut'
    | 'vestColor'
    | 'vestSize'
    | 'vestQty';

export interface FormConfig {
    /** The Form's public `.../viewform` URL, without a query string. */
    readonly viewformUrl: string;
    /** Numeric id after `entry.` for each question (see the Form's preview page). */
    readonly entries: Readonly<Record<FormField, string>>;
}

export interface PrefillOrder {
    readonly code: string;
    readonly lines: readonly OrderLine[];
    readonly membership: Membership;
    readonly currency: Currency;
}

/**
 * Question ids of the Form as restructured by docs/programs/uniform-2026/form-setup.gs,
 * read from the Form's preview page (FB_PUBLIC_LOAD_DATA_). They change if a
 * question is deleted and re-created, so re-read them after such an edit.
 */
const FORM_ENTRIES: FormConfig['entries'] | null = {
    orderCode: '1557806289',
    amount: '1708418500',
    payment: '2070385535',
    membership: '425611584',
    extras: '2058832949',
    jerseyCut: '1846632135',
    jerseySize: '9868957',
    jerseyQty: '1886567049',
    bibCut: '21887089',
    bibSize: '590939562',
    bibQty: '1318275855',
    vestCut: '295293971',
    vestColor: '1014764647',
    vestSize: '1558664158',
    vestQty: '2003499372',
};

/** The Form's public responder link (it exists once the form is published). */
const FORM_VIEWFORM_URL: string | null =
    'https://docs.google.com/forms/d/e/1FAIpQLSeJNy9Xupq8tcjuVrprbjASzmNwdmHM6UGMxOD0si4egvOTPw/viewform';

export const FORM_CONFIG: FormConfig | null =
    FORM_VIEWFORM_URL && FORM_ENTRIES ? { viewformUrl: FORM_VIEWFORM_URL, entries: FORM_ENTRIES } : null;

const FORM_URL_PATTERN = /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/viewform$/;

export function isFormConfigured(config: FormConfig | null): config is FormConfig {
    if (!config || !FORM_URL_PATTERN.test(config.viewformUrl)) return false;
    return Object.values(config.entries).every((id) => /^\d+$/.test(id));
}

function categoryOf(sku: SkuId): SkuCategory {
    const found = SKUS.find((candidate) => candidate.id === sku);
    if (!found) throw new RangeError(`Unknown SKU: ${sku}`);
    return found.category;
}

export interface SplitLines {
    /** The line that fills each item's own columns. */
    readonly primary: Readonly<Partial<Record<SkuCategory, OrderLine>>>;
    /** Everything else: a second size of an item, or a second vest colour. */
    readonly extras: readonly OrderLine[];
}

/** The first line of each item fills its columns; the rest become extras. */
export function splitOrderLines(lines: readonly OrderLine[]): SplitLines {
    const primary: Partial<Record<SkuCategory, OrderLine>> = {};
    const extras: OrderLine[] = [];
    for (const line of lines) {
        const category = categoryOf(line.sku);
        if (primary[category]) extras.push(line);
        else primary[category] = line;
    }
    return { primary, extras };
}

function extraText(line: OrderLine): string {
    const category = categoryOf(line.sku);
    const colour = category === 'vest' ? `${VEST_COLOR_LABEL[line.sku as 'vest-white' | 'vest-black']} ` : '';
    return `${ITEM_NAME[category]} | ${CUT_LABEL[line.cut]} | ${colour}${line.size} | ${line.qty}`;
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
    const { primary, extras } = splitOrderLines(order.lines);

    const values: Partial<Record<FormField, string>> = {
        orderCode: order.code,
        amount: formatAmount(totals.total, order.currency),
        payment: PAYMENT_LABEL[order.currency],
        membership: MEMBERSHIP_LABEL[order.membership],
    };
    if (primary.jersey) {
        values.jerseyCut = CUT_LABEL[primary.jersey.cut];
        values.jerseySize = primary.jersey.size;
        values.jerseyQty = String(primary.jersey.qty);
    }
    if (primary.bib) {
        values.bibCut = CUT_LABEL[primary.bib.cut];
        values.bibSize = primary.bib.size;
        values.bibQty = String(primary.bib.qty);
    }
    if (primary.vest) {
        values.vestCut = CUT_LABEL[primary.vest.cut];
        values.vestColor = VEST_COLOR_LABEL[primary.vest.sku as 'vest-white' | 'vest-black'];
        values.vestSize = primary.vest.size;
        values.vestQty = String(primary.vest.qty);
    }
    if (extras.length > 0) values.extras = extras.map(extraText).join('\n');

    const params = new URLSearchParams({ usp: 'pp_url' });
    for (const field of Object.keys(values) as FormField[]) {
        params.set(`entry.${config.entries[field]}`, values[field] as string);
    }
    return `${config.viewformUrl}?${params.toString()}`;
}
