// src/lib/uniform/contact.ts
// Contact details collected on the order page before payment, then pre-filled
// into the Google Form. They are personal data: kept only in memory and in
// sessionStorage (gone when the tab closes), never in localStorage.

export interface ContactInfo {
    readonly name: string;
    readonly email: string;
    /** International format preferred, e.g. +49 170 1234567. */
    readonly phone: string;
    /** Optional. */
    readonly wechat: string;
}

export type ContactField = keyof ContactInfo;
export type ContactError = 'required' | 'invalid';
/** WeChat is optional, so it never has an error. */
export type ContactErrors = Readonly<Record<Exclude<ContactField, 'wechat'>, ContactError | null>>;

export const EMPTY_CONTACT: ContactInfo = { name: '', email: '', phone: '', wechat: '' };

/** Longest value kept per field; the inputs use the same limits. */
export const CONTACT_MAX_LENGTH: Readonly<Record<ContactField, number>> = {
    name: 80,
    email: 120,
    phone: 40,
    wechat: 60,
};

const FIELDS: readonly ContactField[] = ['name', 'email', 'phone', 'wechat'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s\-().]+$/;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15; // E.164

export function normalizeContact(contact: ContactInfo): ContactInfo {
    return {
        name: contact.name.trim().replace(/\s+/g, ' '),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        wechat: contact.wechat.trim(),
    };
}

function phoneIsValid(phone: string): boolean {
    if (!PHONE_PATTERN.test(phone)) return false;
    const digits = phone.replace(/\D/g, '').length;
    return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

export function validateContact(contact: ContactInfo): ContactErrors {
    const { name, email, phone } = normalizeContact(contact);
    return {
        name: name === '' ? 'required' : null,
        email: email === '' ? 'required' : EMAIL_PATTERN.test(email) ? null : 'invalid',
        phone: phone === '' ? 'required' : phoneIsValid(phone) ? null : 'invalid',
    };
}

export function hasContactErrors(errors: ContactErrors): boolean {
    return Object.values(errors).some((error) => error !== null);
}

export function serializeContact(contact: ContactInfo): string {
    return JSON.stringify(contact);
}

/** Anything unreadable becomes an empty contact: the buyer simply types it again. */
export function parseSavedContact(raw: string | null): ContactInfo {
    if (!raw) return EMPTY_CONTACT;
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return EMPTY_CONTACT;
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return EMPTY_CONTACT;
    const record = data as Record<string, unknown>;
    const read = (field: ContactField): string => {
        const value = record[field];
        return typeof value === 'string' ? value.slice(0, CONTACT_MAX_LENGTH[field]) : '';
    };
    return Object.fromEntries(FIELDS.map((field) => [field, read(field)])) as unknown as ContactInfo;
}
