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

type RequiredField = Exclude<ContactField, 'wechat'>;

/**
 * Name, email, phone and WeChat — asked before paying, like any shop's
 * checkout, then pre-filled into the Google Form so that form is only left
 * with the payment screenshot.
 */
export function ContactStep({ copy, contact, onChange, onSubmit }: ContactStepProps) {
    const { contactStep: text } = copy;
    const [showErrors, setShowErrors] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const errors = validateContact(contact);

    const messageFor = (error: ContactError | null, field: RequiredField): string | null => {
        if (!showErrors || error === null) return null;
        if (error === 'required') return text.errors.required;
        return field === 'email' ? text.errors.invalidEmail : text.errors.invalidPhone;
    };

    function submit(event: Event) {
        event.preventDefault();
        if (hasContactErrors(errors)) {
            setShowErrors(true);
            // Wait for aria-invalid to render, then land on the first problem.
            window.requestAnimationFrame(() =>
                formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(),
            );
            return;
        }
        onSubmit(normalizeContact(contact));
    }

    const field = (
        name: ContactField,
        label: string,
        attrs: { type: string; autocomplete: string; inputmode?: 'email' | 'tel'; hint?: string },
        required: boolean,
    ) => {
        const message = required ? messageFor(errors[name as RequiredField], name as RequiredField) : null;
        const hintId = `kit-contact-${name}-hint`;
        const errorId = `kit-contact-${name}-error`;
        return (
            <div class="kit-field">
                <label class="kit-field-label" for={`kit-contact-${name}`}>
                    {label}
                </label>
                <input
                    class="kit-input"
                    id={`kit-contact-${name}`}
                    name={name}
                    type={attrs.type}
                    autocomplete={attrs.autocomplete}
                    inputMode={attrs.inputmode}
                    required={required}
                    maxLength={CONTACT_MAX_LENGTH[name]}
                    value={contact[name]}
                    aria-invalid={message ? 'true' : undefined}
                    aria-describedby={[attrs.hint ? hintId : null, message ? errorId : null].filter(Boolean).join(' ') || undefined}
                    onInput={(event) => onChange(name, (event.currentTarget as HTMLInputElement).value)}
                />
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
    };

    return (
        <section class="kit-panel" aria-labelledby="kit-contact-title">
            <h3 class="kit-panel-title" id="kit-contact-title">
                {text.title}
            </h3>
            <p class="kit-lede">{text.intro}</p>
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
                <p class="kit-note">{text.privacy}</p>
                <button type="submit" class="kit-btn kit-btn--solid kit-wide">
                    {text.continue}
                </button>
            </form>
        </section>
    );
}
