// src/lib/uniform/payment.ts
// Where kit orders are paid, and who to ask. Shown on the order page only
// after the buyer has chosen their items (step 2), never in the page chrome.

export const PAYMENT = {
    alipay: {
        qrImage: '/images/uniform/pay-alipay.webp',
        /** Name as the Alipay QR displays it. */
        payee: 'Ruining (**宁)',
    },
    sepa: {
        iban: 'DE35701500001007155292',
        bic: 'SSKMDEMMXXX',
        holder: 'RUINING YU',
    },
    contact: {
        wechatQrImage: '/images/uniform/contact-wechat.webp',
        wechatName: 'Ronnie',
        email: 'letusride@across-cc.de',
    },
} as const;

/** "DE35701500001007155292" -> "DE35 7015 0000 1007 1552 92". */
export function formatIban(iban: string): string {
    return iban.replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ');
}

/** ISO 13616 mod-97 check: catches a mistyped digit, not a wrong account. */
export function isValidIban(iban: string): boolean {
    const compact = iban.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
    const rearranged = compact.slice(4) + compact.slice(0, 4);
    let remainder = 0;
    for (const char of rearranged) {
        const digits = String(parseInt(char, 36));
        for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
}
