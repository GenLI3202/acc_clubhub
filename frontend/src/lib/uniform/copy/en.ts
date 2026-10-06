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
        lede: 'Eastern ink, European mountains.',
        deadline: 'Orders close 25 Oct 2026, 23:59 (Munich time)',
        cta: 'Start your order',
        countdown: { label: 'Time left to order', days: 'days', hours: 'hrs', minutes: 'min', seconds: 'sec' },
        timeline: [
            { when: 'Now until 25 Oct', what: 'Order online' },
            { when: '26 – 31 Oct', what: 'ACC tallies the orders and places the order with GRC' },
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
        opening: [
            'Chinese painters have painted mountains for more than a thousand years: the pines of Huangshan, the waters of the Fuchun River, the cliffs of the Taihang range. Their ink-laden brush rarely strayed from the landscapes of home. No one imagined that one day it would travel thousands of kilometres and come to rest on the snow line of the Alps.',
            'We drew the Alpine ridges in ink, line laid over line, and let the blank space become snow and open sky. Eastern brushwork and European mountains meet on a single cycling jersey.',
            'The black waist band is the earth. From it a grey road winds upward, passes through a band of sunset-red cloud and disappears into the mountain forest. The faint traces of orange-red between the peaks are autumn leaves, and the glow of the sky as we set out at dawn and ride home at dusk.',
        ],
        middle: [
            'Chinese painting has an old rule: a picture is not finished until it carries a seal. This jersey carries two. The one above the back pockets reads 慕城骑士, “riders of Munich”. It is our signature, and it stands for us, the riders active in Munich. The other sits in vermilion at the front of the waist and holds just two characters: 平安 (píng’ān), safe and well. The same two characters are brushed by hand on the legs of the bib shorts. On a long ride the legs go round more than ten thousand times, and with every pedal stroke the two characters rise and fall, like a quiet blessing repeated ten thousand times.',
            '平安 may be the plainest and the most solemn thing one Chinese person can say to another. In the Tang dynasty the poet Cen Shen, travelling west to the frontier, met an envoy riding east to Chang’an. They passed on horseback with no paper and no brush, and all he could send home was a single line: tell them I am safe (凭君传语报平安). More than a thousand years later we have travelled even further west, and on the mountain roads of another country we still want to say the same thing: may every rider beside us ride out safely and come home with a full heart.',
        ],
        closing: [
            '穿越无疆, “across, without borders”, is our club’s Chinese name and our creed: Across Paths, Across Mountains, Across Borders. Roads are covered on the strength of our legs; mountains are crossed on willpower. And the borders between countries, between home and abroad, and between languages dissolve in the sweat and laughter of riders taking turns in the wind.',
        ],
        highlight: 'may every rider beside us ride out safely and come home with a full heart.',
        symbolsTitle: 'Four symbols on the right sleeve',
        symbolsIntro:
            'Four symbols run down the right sleeve. They are not writing, yet they have the plainness of something older than writing, like marks scratched into a rock face or signs left at a crossroads by someone travelling far. They are four ways of writing “across”.',
        symbols: [
            { key: 'mountains', name: 'Across Mountains' },
            { key: 'paths', name: 'Across Paths' },
            { key: 'borders', name: 'Across Borders' },
            { key: 'across', name: 'Across' },
        ],
        detailsTitle: 'Small details, real meanings',
        details: [
            {
                title: '平安 (píng’ān)',
                text: 'A vermilion seal at the front of the jersey’s waist, and the same word brushed by hand on the legs of the shorts. One stamped, one written, one above, one below, both saying the same thing: ride out safely, come home happy.',
            },
            {
                title: '穿越无疆',
                text: 'Our club’s Chinese name, written large on the back of the jersey. Across Paths, Mountains, Borders: along the roads, over the mountains, beyond the borders.',
            },
            {
                title: '慕城骑士',
                text: 'The seal above the jersey’s back pockets. 慕城 is Munich; the riders are us. The 平安 seal at the waist carries a wish; this one is the name seal that says who we are.',
            },
            {
                title: 'Pretzel',
                text: 'The small icon on the back of the bib shorts. Munich’s most ordinary bread happens to be tied in a knot, and to Chinese eyes a knot means a bond. This one ties us to the city.',
            },
            {
                title: 'ACROSS · PATHS · MOUNTAINS · BORDERS',
                text: 'Printed on the jersey cuffs, the part closest to the handlebars. The hands hold the direction; the cuffs remember where we are going.',
            },
        ],
        producedBy: 'Produced by GRC',
        close: 'Close',
        sampleTitle: 'Please note: the model wears a sample',
        sampleText:
            'The model is wearing a sample. After receiving it we made small adjustments, above all to the style of the ACC logo; the flat design drawings show the final design. The kit you receive will therefore differ slightly from the model photos.',
    },

    shop: {
        eyebrow: 'Shop',
        title: 'Choose item, size and quantity',
        intro: 'All items are sold separately, with no bundle discount. Choose your membership and payment method first, then your items; check “Your order”, then continue to payment.',
        payTitle: 'Pay and upload your screenshot',
        contactTitle: 'Your contact details',
        wechatTitle: 'Open this page in your browser',
        wechatBody:
            'WeChat’s built-in browser usually cannot sign in to Google, so the screenshot upload in step 3 fails and your order does not follow you to another browser. Tap ··· (top right) → Open in Browser, then order.',
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
                    'Ultra-Curve 53° ergonomic pad: 3 mm mid layer plus 14 mm high-density support; GRC says the carbon-fibre surface prevents harmful bacteria growth',
                    'Silicone-printed grippers at the leg openings',
                ],
            },
            vest: {
                name: 'Vest',
                tagline: 'White or black, same price, your choice',
                bullets: [
                    'Double front zip, opening from the top and the bottom, for easy adjusting and getting on and off',
                    'The breathable mesh back has two openings, so you can reach the pockets of the jersey underneath',
                    'GRC | ACROSS CYCLING CLUB MUNICH on the chest, a large ACC logo on the back',
                ],
            },
        },
        vestColorLabel: 'Colour',
        vestWhite: 'White',
        vestBlack: 'Black',
        vestNote: 'The white vest is semi-transparent, so the layer underneath shows through.',
        priceCore: 'Core member price',
        priceMember: 'Member price',
        priceNonMember: 'Non-member price',
        sizeLabel: 'Size',
        selectSize: 'Choose a cut and a size first',
        designButton: 'Read the design idea',
        cutLabel: 'Cut',
        cutMen: 'Men’s',
        cutWomen: 'Women’s',
        cutHint: 'Men’s and women’s cuts have different size charts — check the size guide below.',
        sizeGuideLink: 'Size guide',
        qtyLabel: 'Quantity',
        add: 'Add to order',
        added: 'Added to your order',
        sampleBadge: 'Sample',
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
        core: 'Core member',
        member: 'ACC member',
        nonMember: 'Non-member',
        membershipHint: 'Self-declared; we check it afterwards.',
        currencyLabel: 'Pay with',
        currencyRmb: 'Alipay · RMB',
        currencyEur: 'Bank transfer · EUR',
        pieces: '{n} pcs',
        subtotal: 'Items',
        transfer: 'Shipping (China → Munich)',
        transferHint: 'Shipping from China to Munich: {single} for a single piece, {each} per piece from two pieces on.',
        total: 'Total due',
        remove: 'Remove',
        increase: 'One more',
        decrease: 'One less',
        continue: 'Confirm and enter details',
        continueDisabled: 'Add at least one item',
        chooseFirst: 'Choose membership and payment method first',
        extrasNote: 'A second size of the same item (or a second vest colour) is written into the form’s “Additional items” field; our team adds it up by hand.',
        fineprint: 'Made to order: no returns or exchanges for a wrong size · pick-up in Munich only',
        termsLink: 'Good to know',
        edit: 'Edit order',
        steps: ['Choose', 'Details', 'Pay', 'Upload, join group'],
        mobileBar: 'View order',
    },

    pay: {
        title: 'Pay',
        intro: 'Pay the amount below and write your order code in the payment note. Afterwards, upload your payment screenshot below.',
        amountDue: 'Amount due',
        orderCode: 'Order code',
        referenceHint: 'Write the order code in the transfer reference (Verwendungszweck).',
        alipayTitle: 'Alipay (RMB)',
        alipayScan:
            'Paying on this phone: save the QR code (long-press or screenshot), open Alipay → Scan → Album and pick the image. Tap “Add note” and enter your order code.',
        payee: 'Payee: ',
        sepaTitle: 'Bank transfer (EUR, SEPA)',
        iban: 'IBAN',
        bic: 'BIC',
        holder: 'Account holder',
        reference: 'Reference',
        copy: 'Copy',
        copied: 'Copied',
        copyFailed: 'Could not copy automatically — press and hold the text',
        editWarning: 'If you have already paid, please do not change the order; contact our team instead.',
        saveNote: 'Take a screenshot of your order code and amount.',
        groupHint: 'After paying and uploading your screenshot, also add Ronnie on WeChat to join the order group (at the bottom of this page).',
        groupTitle: 'Last step: join the order WeChat group',
        groupBody:
            'After submitting the form, add our team member Ronnie on WeChat and ask to be added to the order group. Arrival and pick-up time and place are announced there; without joining you may miss the pick-up.',
        groupScan: 'Scan to add Ronnie on WeChat, and put your name and order code in the request note.',
    },

    contactStep: {
        title: 'Contact details',
        intro: 'Leave your contact details first. They are filled into the order form for you when you open it after paying.',
        nameLabel: 'Name',
        emailLabel: 'Email',
        phoneLabel: 'Phone',
        phoneHint: 'Include the country code, e.g. +49 170 1234567',
        wechatLabel: 'WeChat name (optional)',
        wechatHint: 'Helps our team find you in the WeChat group',
        privacy: 'Used only for this kit order and passed to our team through a Google Form. This page does not store them on a server.',
        continue: 'Confirm and pay',
        errors: {
            required: 'Required',
            invalidEmail: 'This email address looks incomplete',
            invalidPhone: 'Check the phone number and include the country code',
        },
    },

    form: {
        title: 'Upload your payment screenshot',
        intro: 'Your name, contact details and order are already filled into the form. After paying, open it, check everything, upload your payment screenshot and submit.',
        signInNote:
            'Uploading a screenshot requires a Google account. If you cannot sign in (for example in mainland China), send the screenshot and your order code to our team on WeChat or by email.',
        openNewTab: 'Submit the order form',
        comingSoon: 'The order form is being prepared. Please check back shortly.',
    },

    sizes: {
        title: 'Size guide',
        intro: 'Choose by height and weight. Jersey and bib shorts share one chart; the vest comes with garment measurements.',
        men: 'Men’s quick guide',
        women: 'Women’s quick guide',
        sharedNote: 'Jersey and bib shorts',
        vestNote: 'The vest uses the men’s quick guide and is unisex.',
        heightWeight: 'Weight kg ↓ / height cm →',
        gapNote: 'A blank cell means the chart has no recommendation for that height and weight.',
        finderTitle: 'Quick finder',
        sexMen: 'Men',
        sexWomen: 'Women',
        height: 'Height (cm)',
        weight: 'Weight (kg)',
        result: 'Suggested size: {size}',
        noResult: 'The chart has no recommendation for this combination. Please ask our team.',
        back: 'Back to the shop',
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
            'Orders close 25 Oct 2026, 23:59 (Munich time). We place the order with GRC around 31 Oct, and expect delivery in mid-December.',
            'Your membership status is self-declared; we check it afterwards.',
            'Your personal data and payment screenshot are collected through a Google Form and used only for this kit order and to check payments.',
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
        cta: 'See the kit and order',
        deadline: 'Orders close 25 Oct, 23:59 (Munich time)',
    },
};
