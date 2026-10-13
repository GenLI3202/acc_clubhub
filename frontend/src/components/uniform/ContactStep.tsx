import { useRef, useState } from 'preact/hooks';

import type { UniformCopy } from '../../lib/uniform/copy';
import {
    CONTACT_MAX_LENGTH,
    hasContactErrors,
    normalizeContact,
    validateContact,
    type ContactError,
    type ContactField,
    type ContactInfo,
} from '../../lib/uniform/contact';

interface ContactStepProps {
    copy: UniformCopy;
    contact: ContactInfo;
    /** One field changed. Not the whole contact: browser autofill fires several
     *  fields in the same tick, and each must build on the latest state. */
    onChange: (field: ContactField, value: string) => void;
    /** Called with the trimmed contact once every required field is valid. */
    onSubmit: (contact: ContactInfo) => void;
}

/**
 * Name, email, phone, WeChat and — for shipping — a mainland China address,
 * asked before paying. The top notice says who may order here: Munich pick-up
 * or delivery in China; everyone else is sent to Ronnie first.
 */
export function ContactStep({ copy, contact, onChange, onSubmit }: ContactStepProps) {
    const { contactStep: text } = copy;
    const [showErrors, setShowErrors] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const errors = validateContact(contact);

    function messageFor(field: Exclude<ContactField, 'wechat'>): string | null {
        const error: ContactError | null = errors[field];
        if (!showErrors || error === null) return null;
        if (error === 'required') return text.errors.required;
        if (field === 'email') return text.errors.invalidEmail;
        if (field === 'phone') return text.errors.invalidPhone;
        return text.errors.invalidAddress;
    }

    function submit(event: Event) {
        event.preventDefault();
        if (hasContactErrors(errors)) {
            setShowErrors(true);
            // Wait for aria-invalid to render, then land on the first problem.
            window.requestAnimationFrame(() =>
                formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('[aria-invalid="true"]')?.focus(),
            );
            return;
        }
        onSubmit(normalizeContact(contact));
    }

    /** One labelled field: a single line, or a multi-line box for the address. */
    function field(
        name: Exclude<ContactField, 'wechat'> | 'wechat',
        label: string,
        attrs: { type?: string; autocomplete: string; inputmode?: 'email' | 'tel'; hint?: string; multiline?: boolean },
        required: boolean,
    ) {
        const message = name === 'wechat' ? null : messageFor(name);
        const hintId = `kit-contact-${name}-hint`;
        const errorId = `kit-contact-${name}-error`;
        const common = {
            class: attrs.multiline ? 'kit-input kit-address' : 'kit-input',
            id: `kit-contact-${name}`,
            name,
            required,
            maxLength: CONTACT_MAX_LENGTH[name],
            value: contact[name],
            'aria-invalid': message ? ('true' as const) : undefined,
            'aria-describedby':
                [attrs.hint ? hintId : null, message ? errorId : null].filter(Boolean).join(' ') || undefined,
        };
        return (
            <div class="kit-field">
                <label class="kit-field-label" for={`kit-contact-${name}`}>
                    {label}
                </label>
                {attrs.multiline ? (
                    <textarea
                        {...common}
                        rows={3}
                        autocomplete={attrs.autocomplete}
                        onInput={(event) => onChange(name, (event.currentTarget as HTMLTextAreaElement).value)}
                    />
                ) : (
                    <input
                        {...common}
                        type={attrs.type}
                        autocomplete={attrs.autocomplete}
                        inputMode={attrs.inputmode}
                        onInput={(event) => onChange(name, (event.currentTarget as HTMLInputElement).value)}
                    />
                )}
                {attrs.hint && (
                    <p class="kit-note kit-field-hint" id={hintId}>
                        {attrs.hint}
                    </p>
                )}
                {message && (
                    <p class="kit-field-error" id={errorId} role="alert">
                        {message}
                    </p>
                )}
            </div>
        );
    }

    return (
        <section class="kit-panel" aria-labelledby="kit-contact-title">
            <h3 class="kit-panel-title" id="kit-contact-title">
                {text.title}
            </h3>
            <p class="kit-lede">{text.intro}</p>

            <div class="kit-remind kit-scope" role="note">
                <span class="kit-remind-icon" aria-hidden="true">!</span>
                <div>
                    <strong>{text.scopeTitle}</strong>
                    <p>{text.scopeBody}</p>
                </div>
            </div>

            <form class="kit-contact" ref={formRef} onSubmit={submit} noValidate>
                {field('name', text.nameLabel, { type: 'text', autocomplete: 'name' }, true)}
                {field('email', text.emailLabel, { type: 'email', autocomplete: 'email', inputmode: 'email' }, true)}
                {field(
                    'phone',
                    text.phoneLabel,
                    { type: 'tel', autocomplete: 'tel', inputmode: 'tel', hint: text.phoneHint },
                    true,
                )}
                {field('wechat', text.wechatLabel, { type: 'text', autocomplete: 'off', hint: text.wechatHint }, false)}
                {field(
                    'address',
                    text.addressLabel,
                    { autocomplete: 'street-address', hint: text.addressHint, multiline: true },
                    false,
                )}
                <p class="kit-note">{text.privacy}</p>
                <button type="submit" class="kit-btn kit-btn--solid kit-wide">
                    {text.continue}
                </button>
            </form>
        </section>
    );
}
