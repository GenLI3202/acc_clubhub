import { describe, expect, it } from 'vitest';

import {
    EMPTY_CONTACT,
    hasContactErrors,
    normalizeContact,
    parseSavedContact,
    serializeContact,
    validateContact,
    type ContactInfo,
} from '../contact';

const valid: ContactInfo = {
    name: 'Li Wei',
    email: 'li.wei@example.com',
    phone: '+49 170 1234567',
    wechat: 'liwei_cycling',
    address: '北京市朝阳区某某路 1 号 100000',
};

describe('validateContact', () => {
    it('accepts a complete contact', () => {
        const errors = validateContact(valid);
        expect(errors).toEqual({ name: null, email: null, phone: null, address: null });
        expect(hasContactErrors(errors)).toBe(false);
    });

    it('needs a name, an email and a phone number; WeChat is optional', () => {
        const errors = validateContact(EMPTY_CONTACT);
        expect(errors).toEqual({ name: 'required', email: 'required', phone: 'required', address: null });
        expect(hasContactErrors(errors)).toBe(true);
        expect(validateContact({ ...valid, wechat: '' }).name).toBeNull();
    });

    it('treats whitespace-only fields as empty', () => {
        expect(validateContact({ ...valid, name: '   ' }).name).toBe('required');
    });

    it('rejects an email without a domain', () => {
        expect(validateContact({ ...valid, email: 'li.wei@' }).email).toBe('invalid');
        expect(validateContact({ ...valid, email: 'li wei@example.com' }).email).toBe('invalid');
        expect(validateContact({ ...valid, email: 'li.wei@example' }).email).toBe('invalid');
    });

    it('accepts international phone formats with spaces, dashes and brackets', () => {
        for (const phone of ['+49 170 1234567', '0049-170-1234567', '+86 (138) 0013 8000', '13800138000']) {
            expect(validateContact({ ...valid, phone }).phone).toBeNull();
        }
    });

    it('rejects phone numbers with letters or the wrong length', () => {
        for (const phone of ['12345', 'call me', '+49 170 12345678901234']) {
            expect(validateContact({ ...valid, phone }).phone).toBe('invalid');
        }
    });

    it('leaves the address optional: empty means Munich pick-up', () => {
        expect(validateContact({ ...valid, address: '' }).address).toBeNull();
        expect(validateContact({ ...valid, address: '   ' }).address).toBeNull();
    });

    it('asks for a full address when one is typed but looks too short', () => {
        expect(validateContact({ ...valid, address: '北京' }).address).toBe('invalid');
        expect(hasContactErrors(validateContact({ ...valid, address: '北京' }))).toBe(true);
    });
});

describe('normalizeContact', () => {
    it('trims every field and collapses inner whitespace in the name', () => {
        expect(
            normalizeContact({
                name: '  Li   Wei ',
                email: ' a@b.de ',
                phone: ' +49 1 ',
                wechat: ' w ',
                address: ' 北京市朝阳区 ',
            }),
        ).toEqual({ name: 'Li Wei', email: 'a@b.de', phone: '+49 1', wechat: 'w', address: '北京市朝阳区' });
    });
});

describe('saved contact', () => {
    it('round-trips through serialize and parse', () => {
        expect(parseSavedContact(serializeContact(valid))).toEqual(valid);
    });

    it('falls back to an empty contact for missing or broken data', () => {
        expect(parseSavedContact(null)).toEqual(EMPTY_CONTACT);
        expect(parseSavedContact('not json')).toEqual(EMPTY_CONTACT);
        expect(parseSavedContact('[1,2]')).toEqual(EMPTY_CONTACT);
    });

    it('reads a contact saved before the address field existed', () => {
        const old = JSON.stringify({ name: 'Li Wei', email: 'li@example.com', phone: '+49 1', wechat: '' });
        expect(parseSavedContact(old)).toEqual({ ...EMPTY_CONTACT, name: 'Li Wei', email: 'li@example.com', phone: '+49 1' });
    });

    it('ignores fields of the wrong type and caps field length', () => {
        const parsed = parseSavedContact(JSON.stringify({ name: 42, email: 'x@y.de', phone: 'p'.repeat(500) }));
        expect(parsed.name).toBe('');
        expect(parsed.email).toBe('x@y.de');
        expect(parsed.phone.length).toBeLessThanOrEqual(40);
        expect(parseSavedContact(JSON.stringify({ address: 'a'.repeat(500) })).address.length).toBeLessThanOrEqual(200);
    });
});
