import type { UniformCopy } from './types';

export const de: UniformCopy = {
    meta: {
        title: 'ACC Kit 2026 bestellen',
        description:
            'Bestelle das Across Cycling Club München Kit 2026: Trikot, Trägerhose und Weste. Bestellschluss 25. Oktober 2026, Abholung in München.',
    },

    hero: {
        eyebrow: 'ACC Kit 2026',
        title: 'Das Kit 2026',
        lede: 'Alpine Gratlinien, in Tusche auf ein Radtrikot gemalt.',
        deadline: 'Bestellschluss 25.10.2026, 23:59 Uhr (Münchner Zeit)',
        cta: 'Jetzt bestellen',
        countdown: { label: 'Noch bis Bestellschluss', days: 'Tage', hours: 'Std.', minutes: 'Min.', seconds: 'Sek.' },
        timeline: [
            { when: 'Ab sofort bis 25. Okt.', what: 'Online bestellen' },
            { when: '26. – 31. Okt.', what: 'ACC stellt die Bestellungen zusammen und bestellt bei GRC' },
            { when: 'Mitte Dezember', what: 'Voraussichtliche Lieferung · Abholung in München' },
        ],
    },

    closed: {
        title: 'Bestellschluss erreicht',
        body: 'Die Bestellphase für das Kit 2026 endete am 25. Oktober um 23:59 Uhr (Münchner Zeit). Fragen? Melde dich bei unserem Team.',
    },

    story: {
        eyebrow: 'Die Idee',
        title: 'Across – ohne Grenzen',
        paragraphs: [
            'Die Gratlinien der Alpen, in der freien Pinselführung chinesischer Tuschemalerei auf ein Radtrikot gebracht: Across Mountains.',
            'Eine geschwungene graue Straße beginnt am schwarzen Taillenband, das für Asphalt und Erde steht, führt durch ein Band aus abendrotem Gewölk und verschwindet im Wald: Across Paths – und Across Borders.',
            'Die zarten orangeroten Tuschelinien sind das Herbstlaub der Bergwälder und zugleich die Wolken bei Sonnenauf- und Sonnenuntergang.',
        ],
        symbolsTitle: 'Vier Symbole am rechten Ärmel',
        symbols: [
            { key: 'mountains', name: 'Across Mountains' },
            { key: 'paths', name: 'Across Paths' },
            { key: 'borders', name: 'Across Borders' },
            { key: 'across', name: 'Across' },
        ],
        detailsTitle: 'Kleine Details mit Bedeutung',
        details: [
            { title: 'Brezn', text: 'Das kleine Symbol auf der Rückseite der Trägerhose steht für München.' },
            {
                title: '平安 (píng’ān)',
                text: 'Handgeschriebenes 平安 am Hosenbein und ein rotes 平安-Siegel vorn seitlich an der Taille des Trikots. Es wünscht dir eine sichere Fahrt.',
            },
            {
                title: '慕城骑士',
                text: 'Das Siegel über den Rückentaschen des Trikots: „Radfahrer aus München“. Wir sind eine Radfahr-Community, die in München lebt und fährt.',
            },
            {
                title: 'ACROSS · PATHS · MOUNTAINS · BORDERS',
                text: 'Rund um die Ärmelbündchen des Trikots gedruckt.',
            },
        ],
        producedBy: 'Hergestellt von GRC',
        close: 'Schließen',
        sampleTitle: 'Bitte beachten: Das Model trägt ein Musterexemplar',
        sampleText:
            'Das Model trägt ein Musterteil. Nach dem Erhalt haben wir kleine Anpassungen vorgenommen, vor allem beim Stil des ACC-Logos; maßgeblich sind die Designzeichnungen. Das Kit, das du erhältst, weicht deshalb leicht von den Fotos mit Model ab.',
    },

    shop: {
        eyebrow: 'Shop',
        title: 'Artikel, Größe und Anzahl wählen',
        intro: 'Alle Artikel werden einzeln verkauft, es gibt keinen Set-Rabatt. Wähle zuerst Mitgliedschaft und Zahlungsart, dann deine Artikel; prüfe „Deine Bestellung“ und gehe dann zur Zahlung.',
        payTitle: 'Bezahlen und Bestellung absenden',
        wechatTitle: 'Bitte im Browser öffnen',
        wechatBody:
            'Der Browser in WeChat kann sich meist nicht bei Google anmelden: Der Screenshot-Upload in Schritt 3 schlägt dann fehl, und deine Bestellung wird nicht in einen anderen Browser übernommen. Tippe oben rechts auf ··· → „Im Browser öffnen“ und bestelle dort.',
        products: {
            jersey: {
                name: 'Kurzarmtrikot',
                tagline: 'Weiß mit Tusche-Gratlinien, rot-schwarze Taille',
                bullets: [
                    '3D-Schnitt, eng anliegend und sehr elastisch',
                    'Atmungsaktive Netzärmel, Stoff mit Kühleffekt, für 25 °C und mehr',
                    'YKK-Reißverschluss und Silikon-Gripper am Saum',
                    'Nahtlos verklebte Bündchen für weniger Reibung',
                    'Drei Rückentaschen',
                ],
                tip: 'Das Trikot ist sehr dehnbar: Bei 175 cm / 68 kg sitzt S eng und aerodynamisch (die Tabelle empfiehlt M).',
            },
            bib: {
                name: 'Trägerhose (kurz)',
                tagline: 'Ganz in Schwarz, Siebdruck 平安 und GRC',
                bullets: [
                    'Spacer-Doppelgewebe: elastisch, atmungsaktiv, wärmeableitend',
                    '4,5 cm breite Träger mit Rillenstruktur, leichtes Netzgewebe am Rücken',
                    'Ergonomisches Ultra-Curve-53°-Polster: 3 mm Mittelschicht plus 14 mm hochdichte Stütze; laut GRC verhindert die Carbonfaser-Oberfläche das Wachstum schädlicher Bakterien',
                    'Silikon-Gripper am Beinabschluss',
                ],
            },
            vest: {
                name: 'Weste',
                tagline: 'Weiß oder Schwarz, gleicher Preis, freie Wahl',
                bullets: [
                    'Reißverschluss vorn. Der atmungsaktive Netzrücken hat zwei Öffnungen, durch die du an die Taschen des Trikots darunter greifst',
                    'GRC | ACROSS CYCLING CLUB MUNICH auf der Brust, großes ACC-Logo auf dem Rücken',
                ],
            },
        },
        vestColorLabel: 'Farbe',
        vestWhite: 'Weiß',
        vestBlack: 'Schwarz',
        vestNote: 'Die weiße Weste ist halbtransparent, die Kleidung darunter scheint durch.',
        priceMember: 'Preis für Mitglieder',
        priceNonMember: 'Preis für Nichtmitglieder',
        sizeLabel: 'Größe',
        selectSize: 'Bitte zuerst Schnitt und Größe wählen',
        designButton: 'Designidee ansehen',
        cutLabel: 'Schnitt',
        cutMen: 'Herren',
        cutWomen: 'Damen',
        cutHint: 'Herren- und Damenschnitt haben unterschiedliche Größentabellen – bitte unten nachsehen.',
        sizeGuideLink: 'Größentabelle',
        qtyLabel: 'Anzahl',
        add: 'Hinzufügen',
        added: 'Zur Bestellung hinzugefügt',
        sampleBadge: 'Musterexemplar',
        imageAlt: {
            flat: 'Designzeichnung',
            front: 'Model, Vorderseite',
            back: 'Model, Rückseite',
            left: 'Model, links',
            right: 'Model, rechts',
            selfie: 'Model, Selfie',
        },
    },

    summary: {
        title: 'Deine Bestellung',
        empty: 'Noch nichts ausgewählt. Wähle eine Größe und drücke „Hinzufügen“.',
        membershipLabel: 'ACC-Mitgliedschaft',
        member: 'ACC-Mitglied',
        nonMember: 'Nichtmitglied',
        membershipHint: 'Selbstauskunft, wir prüfen sie nachträglich.',
        currencyLabel: 'Bezahlen mit',
        currencyRmb: 'Alipay · RMB',
        currencyEur: 'Überweisung · EUR',
        pieces: '{n} Stk.',
        subtotal: 'Artikel',
        transfer: 'Versand (China → München)',
        transferHint: 'Versand von China nach München: {single} bei einem Teil, ab zwei Teilen {each} pro Teil.',
        total: 'Gesamtbetrag',
        remove: 'Entfernen',
        increase: 'Eines mehr',
        decrease: 'Eines weniger',
        continue: 'Bestätigen und bezahlen',
        continueDisabled: 'Mindestens einen Artikel hinzufügen',
        chooseFirst: 'Bitte zuerst Mitgliedschaft und Zahlungsart wählen',
        extrasNote: 'Eine zweite Größe desselben Artikels (oder eine zweite Westenfarbe) steht im Formularfeld „Additional items“; unser Team rechnet sie von Hand zusammen.',
        fineprint: 'Maßanfertigung: keine Rückgabe bei falscher Größe · nur Abholung in München',
        termsLink: 'Gut zu wissen',
        edit: 'Bestellung ändern',
        steps: ['Auswahl', 'Zahlung', 'Formular'],
        mobileBar: 'Bestellung ansehen',
    },

    pay: {
        title: 'Bezahlen',
        intro: 'Zahle den Betrag unten und schreibe deinen Bestellcode in den Verwendungszweck. Danach sendest du im nächsten Schritt das Formular ab und lädst deinen Zahlungsnachweis hoch.',
        amountDue: 'Zu zahlender Betrag',
        orderCode: 'Bestellcode',
        referenceHint: 'Trage den Bestellcode im Verwendungszweck der Überweisung ein.',
        alipayTitle: 'Alipay (RMB)',
        alipayScan:
            'Zahlung auf diesem Handy: QR-Code speichern (gedrückt halten oder Screenshot), in Alipay „Scannen“ → „Album“ öffnen und das Bild wählen. Unter „Notiz hinzufügen“ den Bestellcode eintragen.',
        payee: 'Empfänger: ',
        sepaTitle: 'Überweisung (EUR, SEPA)',
        iban: 'IBAN',
        bic: 'BIC',
        holder: 'Kontoinhaber',
        reference: 'Verwendungszweck',
        copy: 'Kopieren',
        copied: 'Kopiert',
        copyFailed: 'Automatisches Kopieren nicht möglich – Text gedrückt halten',
        editWarning: 'Wenn du schon bezahlt hast, ändere die Bestellung bitte nicht, sondern melde dich bei unserem Team.',
        saveNote: 'Mache einen Screenshot von Bestellcode und Betrag.',
    },

    form: {
        title: 'Bestellformular absenden',
        intro: 'Deine Bestellung ist beim Öffnen des Formulars bereits eingetragen. Ergänze dort deine Kontaktdaten und lade deinen Zahlungsnachweis hoch.',
        signInNote:
            'Für den Upload eines Screenshots brauchst du ein Google-Konto. Wenn du dich nicht anmelden kannst (zum Beispiel in Festlandchina), schicke Screenshot und Bestellcode per WeChat oder E-Mail an unser Team.',
        openNewTab: 'Bestellformular öffnen',
        comingSoon: 'Das Bestellformular wird gerade vorbereitet. Bitte schau in Kürze wieder vorbei.',
    },

    sizes: {
        title: 'Größentabelle',
        intro: 'Wähle nach Körpergröße und Gewicht. Trikot und Trägerhose teilen sich eine Tabelle; für die Weste gibt es zusätzlich Maße des Kleidungsstücks.',
        men: 'Herren – Schnellauswahl',
        women: 'Damen – Schnellauswahl',
        sharedNote: 'Trikot und Trägerhose',
        vestNote: 'Die Weste nutzt die Herren-Tabelle und ist unisex.',
        heightWeight: 'Gewicht kg ↓ / Körpergröße cm →',
        gapNote: 'Ein leeres Feld bedeutet: Für diese Kombination gibt die Tabelle keine Empfehlung.',
        finderTitle: 'Schnellsuche',
        sexMen: 'Herren',
        sexWomen: 'Damen',
        height: 'Körpergröße (cm)',
        weight: 'Gewicht (kg)',
        result: 'Empfohlene Größe: {size}',
        noResult: 'Für diese Kombination gibt die Tabelle keine Empfehlung. Frag bitte unser Team.',
        back: 'Zurück zum Shop',
        vestTableTitle: 'Maße der Weste (cm)',
        vestColumns: ['Größe', 'Brust', 'Kragen', 'Saum', 'Vorderlänge', 'Rückenlänge'],
        tolerance: 'Von Hand gemessen, mit kleiner Toleranz.',
    },

    terms: {
        title: 'Gut zu wissen',
        items: [
            'Das Model trägt ein Musterexemplar. Maßgeblich sind die Designzeichnungen (der Stil des ACC-Logos wurde angepasst), das Endprodukt weicht deshalb von den Fotos ab.',
            'Umtausch nur bei Qualitätsmängeln. Sonst gibt es weder Rückgabe noch Umtausch, auch nicht bei falscher Größe – bitte nutze die Größentabelle.',
            'Nur Abholung in München, kein Versand. Die Details klären wir in der WeChat-Gruppe.',
            'Bestellschluss 25.10.2026, 23:59 Uhr (Münchner Zeit). Wir bestellen am 31. Okt. bei GRC und erwarten die Lieferung Mitte Dezember.',
            'Deine Mitgliedschaft gibst du selbst an, wir prüfen sie nachträglich.',
            'Deine persönlichen Daten und der Zahlungsnachweis werden über ein Google-Formular erfasst und nur für diese Kit-Bestellung und zur Zahlungsprüfung verwendet.',
        ],
    },

    contact: {
        title: 'Fragen? Melde dich bei uns',
        body: 'Scanne den QR-Code, um unser Team auf WeChat hinzuzufügen, oder schreibe an das ACC-Postfach.',
        wechat: 'WeChat: Ronnie',
        email: 'ACC-E-Mail',
    },

    banner: {
        eyebrow: 'ACC Kit 2026',
        title: 'Das Kit 2026 ist bestellbar',
        body: 'Alpine Gratlinien, in Tusche auf ein Radtrikot gemalt. Trikot, Trägerhose und Weste, Abholung in München.',
        cta: 'Kit ansehen und bestellen',
        deadline: 'Bestellschluss 25. Okt., 23:59 Uhr (Münchner Zeit)',
    },
};
