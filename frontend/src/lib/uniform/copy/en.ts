import type { UniformCopy } from './types';

export const en: UniformCopy = {
    meta: {
        title: 'ACC 2026 Kit Order',
        description:
            'Order the Across Cycling Club Munich 2026 kit: jersey, bib shorts and vest. Orders close 25 October 2026, pick-up in Munich.',
    },

    hero: {
        eyebrow: 'ACC 2026 Kit',
        title: 'The 2026 Kit',
        lede: 'Alpine ridgelines, painted in ink on a cycling kit.',
        deadline: 'Orders close 25 Oct 2026, 23:59 (Munich time)',
        cta: 'Start your order',
        timeline: [
            { when: '25 Oct', what: 'Orders close' },
            { when: '31 Oct', what: 'Order placed with GRC' },
            { when: 'Mid-December', what: 'Expected delivery · pick-up in Munich' },
        ],
    },

    closed: {
        title: 'Orders are closed',
        body: 'Orders for the 2026 kit closed on 25 October at 23:59 (Munich time). Questions? Get in touch with our team.',
    },

    story: {
        eyebrow: 'The idea',
        title: 'Across, without borders',
        paragraphs: [
            'Alpine ridgelines, drawn in the loose brushwork of Chinese ink painting and carried onto a cycling kit: Across Mountains.',
            'A winding grey road starts at the black waist band, which stands for tarmac and earth, climbs through a band of sunset-red cloud and slips into the forest: Across Paths, and Across Borders.',
            'The faint orange-red ink lines are autumn leaves in the mountain woods, and the clouds at sunrise and sunset.',
        ],
        symbolsTitle: 'Four symbols on the right sleeve',
        symbols: [
            { key: 'mountains', name: 'Across Mountains' },
            { key: 'paths', name: 'Across Paths' },
            { key: 'borders', name: 'Across Borders' },
            { key: 'across', name: 'Across' },
        ],
        detailsTitle: 'Small details, real meanings',
        details: [
            { title: 'Pretzel', text: 'The small icon on the back of the bib shorts stands for Munich.' },
            {
                title: '平安 (píng’ān)',
                text: 'Handwritten 平安 on the leg of the shorts, and a red 平安 seal at the front side of the jersey’s waist. It wishes you a safe ride.',
            },
            {
                title: '慕城骑士',
                text: 'The seal above the jersey’s back pockets: “riders of Munich”. We are a cycling community that lives and rides in Munich.',
            },
            {
                title: 'ACROSS · PATHS · MOUNTAINS · BORDERS',
                text: 'Printed around the jersey cuffs.',
            },
        ],
        producedBy: 'Produced by GRC',
        sampleTitle: 'Please note: the model wears a sample',
        sampleText:
            'The model is wearing a sample. After receiving it we made small adjustments, above all to the style of the ACC logo; the flat design drawings show the final design. The kit you receive will therefore differ slightly from the model photos.',
    },

    shop: {
        eyebrow: 'Shop',
        title: 'Choose item, size and quantity',
        intro: 'All items are sold separately, with no bundle discount. Check your order on the right, then continue to payment.',
        products: {
            jersey: {
                name: 'Short-sleeve jersey',
                tagline: 'White ink-wash ridgelines, red and black waist',
                bullets: [
                    '3D-cut for a close, high-stretch fit',
                    'Breathable mesh sleeves, cool-touch fabric, made for 25 °C and up',
                    'YKK zip and a silicone gripper hem',
                    'Seamless bonded cuffs to reduce friction',
                    'Three rear pockets',
                ],
                tip: 'The jersey stretches a lot: at 175 cm / 68 kg, S gives a tight aero fit (the chart suggests M).',
            },
            bib: {
                name: 'Bib shorts',
                tagline: 'All black, screen-printed 平安 and GRC',
                bullets: [
                    'Spacer double-layer fabric: stretchy, breathable, vents heat',
                    '4.5 cm grooved stretch straps and a lightweight mesh back',
                    'Ultra-Curve 53° ergonomic pad: 3 mm mid layer plus 14 mm high-density support, carbon-fibre surface against bacteria',
                    'Silicone-printed grippers at the leg openings',
                ],
            },
            vest: {
                name: 'Vest',
                tagline: 'White or black, same price, your choice',
                bullets: [
                    'Light and thin; the white one is semi-transparent',
                    'Front zip. The breathable mesh back has two openings, so you can reach through to the pockets of the jersey underneath',
                    'GRC | ACROSS CYCLING CLUB MUNICH on the chest, a large ACC logo on the back',
                ],
            },
        },
        vestColorLabel: 'Colour',
        vestWhite: 'White',
        vestBlack: 'Black',
        vestNote: 'The white vest is semi-transparent, so the layer underneath shows through.',
        priceMember: 'Member price',
        priceNonMember: 'Non-member price',
        sizeLabel: 'Size',
        selectSize: 'Choose a size first',
        sizeGuideLink: 'Size guide',
        qtyLabel: 'Quantity',
        add: 'Add to order',
        added: 'Added to your order',
        imageAlt: {
            flat: 'Design drawing',
            front: 'Model, front',
            back: 'Model, back',
            left: 'Model, left',
            right: 'Model, right',
            selfie: 'Model, selfie',
        },
    },

    summary: {
        title: 'Your order',
        empty: 'Nothing here yet. Pick a size and press “Add to order”.',
        membershipLabel: 'ACC membership',
        member: 'ACC member',
        nonMember: 'Non-member',
        membershipHint: 'Self-declared; we check it afterwards.',
        currencyLabel: 'Pay with',
        currencyRmb: 'Alipay · RMB',
        currencyEur: 'Bank transfer · EUR',
        pieces: '{n} pcs',
        subtotal: 'Items',
        transfer: 'Transfer fee',
        transferHint: 'Shipping from China to Munich: {single} for a single piece, {each} per piece from two pieces on.',
        total: 'Total due',
        remove: 'Remove',
        continue: 'Confirm and pay',
        continueDisabled: 'Add at least one item',
        edit: 'Edit order',
        steps: ['Choose', 'Pay', 'Submit form'],
        mobileBar: 'View order',
    },

    pay: {
        title: 'Pay',
        intro: 'Pay the amount below and write your order code in the payment note. Afterwards, submit the form in the next step and upload your payment screenshot.',
        amountDue: 'Amount due',
        orderCode: 'Order code',
        referenceHint: 'Put the order code in the transfer reference (Verwendungszweck) or the Alipay note.',
        alipayTitle: 'Alipay (RMB)',
        alipayScan: 'Pay with “Scan” in Alipay',
        payee: 'Payee',
        sepaTitle: 'Bank transfer (EUR, SEPA)',
        iban: 'IBAN',
        bic: 'BIC',
        holder: 'Account holder',
        reference: 'Reference',
        copy: 'Copy',
        copied: 'Copied',
    },

    form: {
        title: 'Submit your order form',
        intro: 'Your order is already filled in below. Add your contact details and upload your payment screenshot.',
        signInNote:
            'Uploading a screenshot requires a Google account. If you cannot sign in (for example in mainland China), send the screenshot and your order code to our team on WeChat or by email.',
        openNewTab: 'Open the form in a new tab',
        comingSoon: 'The order form is being prepared. Please check back shortly.',
        iframeTitle: 'ACC 2026 kit order form',
    },

    sizes: {
        title: 'Size guide',
        intro: 'Choose by height and weight. Jersey and bib shorts share one chart; the vest comes with garment measurements.',
        men: 'Men’s quick guide',
        women: 'Women’s quick guide',
        sharedNote: 'Jersey and bib shorts',
        vestNote: 'The vest uses the men’s quick guide and is unisex.',
        heightWeight: 'Height cm ↓ / weight kg →',
        gapNote: 'A blank cell means the chart has no recommendation for that height and weight.',
        finderTitle: 'Quick finder',
        sexMen: 'Men',
        sexWomen: 'Women',
        height: 'Height (cm)',
        weight: 'Weight (kg)',
        result: 'Suggested size: {size}',
        noResult: 'The chart has no recommendation for this combination. Please ask our team.',
        vestTableTitle: 'Vest garment measurements (cm)',
        vestColumns: ['Size', 'Chest', 'Collar', 'Hem', 'Front length', 'Back length'],
        tolerance: 'Measured by hand, with a small tolerance.',
    },

    terms: {
        title: 'Good to know',
        items: [
            'The model wears a sample. The final product follows the design drawings (the ACC logo style was adjusted), so it will differ from the photos.',
            'Items can be exchanged for quality problems only. Otherwise there are no returns or exchanges, wrong size included, so please check the size guide.',
            'Pick-up in Munich only, no shipping. We will agree the details in the WeChat group.',
            'Orders close 25 Oct 2026, 23:59 (Munich time). We place the order with GRC on about 31 Oct, and expect delivery in mid-December.',
            'Your membership status is self-declared; we check it afterwards.',
            'Your personal data and payment screenshot are used only for this kit order and to check payments.',
        ],
    },

    contact: {
        title: 'Questions? Get in touch',
        body: 'Scan the QR code to add our team on WeChat, or write to the ACC mailbox.',
        wechat: 'WeChat: Ronnie',
        email: 'ACC email',
    },

    banner: {
        eyebrow: 'ACC 2026 Kit',
        title: 'The 2026 kit is open for orders',
        body: 'Alpine ridgelines, painted in ink on a cycling kit. Jersey, bib shorts and vest, picked up in Munich.',
        cta: 'See the kit and order',
        deadline: 'Orders close 25 Oct, 23:59 (Munich time)',
    },
};
