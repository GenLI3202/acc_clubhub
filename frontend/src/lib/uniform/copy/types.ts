// src/lib/uniform/copy/types.ts
// Shape of the kit-order page copy. Every locale file must satisfy it, so a
// missing translation is a type error rather than a blank string on the page.

import type { SkuCategory } from '../pricing';

export interface ProductCopy {
    readonly name: string;
    readonly tagline: string;
    readonly bullets: readonly string[];
    /** Optional fit advice shown under the size picker. */
    readonly tip?: string;
}

export type SymbolKey = 'mountains' | 'paths' | 'borders' | 'across';

export interface UniformCopy {
    readonly meta: { readonly title: string; readonly description: string };

    readonly hero: {
        readonly eyebrow: string;
        readonly title: string;
        readonly lede: string;
        readonly deadline: string;
        readonly cta: string;
        readonly countdown: {
            readonly label: string;
            readonly days: string;
            readonly hours: string;
            readonly minutes: string;
            readonly seconds: string;
        };
        readonly timeline: readonly { readonly when: string; readonly what: string }[];
    };

    readonly closed: { readonly title: string; readonly body: string };

    readonly story: {
        readonly eyebrow: string;
        readonly title: string;
        readonly paragraphs: readonly string[];
        readonly symbolsTitle: string;
        readonly symbols: readonly { readonly key: SymbolKey; readonly name: string }[];
        readonly detailsTitle: string;
        readonly details: readonly { readonly title: string; readonly text: string }[];
        readonly producedBy: string;
        readonly close: string;
        readonly sampleTitle: string;
        readonly sampleText: string;
    };

    readonly shop: {
        readonly eyebrow: string;
        readonly title: string;
        readonly intro: string;
        /** Heading shown once the buyer has moved on to paying. */
        readonly payTitle: string;
        readonly wechatTitle: string;
        readonly wechatBody: string;
        readonly products: Readonly<Record<SkuCategory, ProductCopy>>;
        readonly vestColorLabel: string;
        readonly vestWhite: string;
        readonly vestBlack: string;
        readonly vestNote: string;
        readonly priceMember: string;
        readonly priceNonMember: string;
        readonly sizeLabel: string;
        readonly selectSize: string;
        /** Opens the design-idea dialog from the jersey card. */
        readonly designButton: string;
        readonly cutLabel: string;
        readonly cutMen: string;
        readonly cutWomen: string;
        readonly cutHint: string;
        readonly sizeGuideLink: string;
        readonly qtyLabel: string;
        readonly add: string;
        readonly added: string;
        /** Badge on every model photo: they show a sample, not the final kit. */
        readonly sampleBadge: string;
        readonly imageAlt: {
            readonly flat: string;
            readonly front: string;
            readonly back: string;
            readonly left: string;
            readonly right: string;
            readonly selfie: string;
        };
    };

    readonly summary: {
        readonly title: string;
        readonly empty: string;
        readonly membershipLabel: string;
        readonly member: string;
        readonly nonMember: string;
        readonly membershipHint: string;
        readonly currencyLabel: string;
        readonly currencyRmb: string;
        readonly currencyEur: string;
        readonly pieces: string;
        readonly subtotal: string;
        readonly transfer: string;
        /** Placeholders {single} and {each} are filled with formatted money. */
        readonly transferHint: string;
        readonly total: string;
        readonly remove: string;
        readonly continue: string;
        readonly continueDisabled: string;
        /** Shown while membership or payment method is still unchosen. */
        readonly chooseFirst: string;
        /** Shown when a second size of an item goes into the form's "other sizes" field. */
        readonly extrasNote: string;
        /** One line above the Continue button, linking to the terms. */
        readonly fineprint: string;
        readonly termsLink: string;
        readonly edit: string;
        readonly steps: readonly [string, string, string];
        readonly mobileBar: string;
    };

    readonly pay: {
        readonly title: string;
        readonly intro: string;
        readonly amountDue: string;
        readonly orderCode: string;
        readonly referenceHint: string;
        readonly alipayTitle: string;
        readonly alipayScan: string;
        readonly payee: string;
        readonly sepaTitle: string;
        readonly iban: string;
        readonly bic: string;
        readonly holder: string;
        readonly reference: string;
        readonly copy: string;
        readonly copied: string;
        readonly copyFailed: string;
        readonly editWarning: string;
        readonly saveNote: string;
    };

    readonly form: {
        readonly title: string;
        readonly intro: string;
        readonly signInNote: string;
        readonly openNewTab: string;
        readonly comingSoon: string;
    };

    readonly sizes: {
        readonly title: string;
        readonly intro: string;
        readonly men: string;
        readonly women: string;
        readonly sharedNote: string;
        readonly vestNote: string;
        readonly heightWeight: string;
        readonly gapNote: string;
        readonly finderTitle: string;
        readonly sexMen: string;
        readonly sexWomen: string;
        readonly height: string;
        readonly weight: string;
        readonly result: string;
        readonly noResult: string;
        readonly back: string;
        readonly vestTableTitle: string;
        readonly vestColumns: readonly [string, string, string, string, string, string];
        readonly tolerance: string;
    };

    readonly terms: { readonly title: string; readonly items: readonly string[] };

    readonly contact: {
        readonly title: string;
        readonly body: string;
        readonly wechat: string;
        readonly email: string;
    };

    readonly banner: {
        readonly eyebrow: string;
        readonly title: string;
        readonly body: string;
        readonly cta: string;
        readonly deadline: string;
    };
}
