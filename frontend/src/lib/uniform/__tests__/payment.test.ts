import { describe, expect, it } from 'vitest';

import { PAYMENT, formatIban, isValidIban } from '../payment';

describe('isValidIban', () => {
    it('accepts the club account', () => {
        expect(isValidIban(PAYMENT.sepa.iban)).toBe(true);
    });

    it('accepts an IBAN written with spaces', () => {
        expect(isValidIban('DE35 7015 0000 1007 1552 92')).toBe(true);
    });

    it('rejects a mistyped digit and malformed input', () => {
        expect(isValidIban('DE35701500001007155293')).toBe(false);
        expect(isValidIban('')).toBe(false);
        expect(isValidIban('not an iban')).toBe(false);
    });
});

describe('formatIban', () => {
    it('groups the IBAN in blocks of four for reading', () => {
        expect(formatIban(PAYMENT.sepa.iban)).toBe('DE35 7015 0000 1007 1552 92');
    });
});

describe('PAYMENT', () => {
    it('points at the supplied QR images', () => {
        expect(PAYMENT.alipay.qrImage).toBe('/images/uniform/pay-alipay.webp');
        expect(PAYMENT.contact.wechatQrImage).toBe('/images/uniform/contact-wechat.webp');
    });
});
