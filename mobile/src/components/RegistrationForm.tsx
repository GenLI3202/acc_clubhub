import { useState } from "preact/hooks";

import type { MobileContentItem, MobileLocale } from "../../../shared/mobile_content";
import { submit_registration, type RegistrationFields } from "../services/api";
import { translate } from "../i18n";

interface RegistrationFormProps {
    item: MobileContentItem;
    locale: MobileLocale;
}

const EMPTY_FORM: RegistrationFields = {
    email: "",
    name: "",
    notes: "",
    privacy_accepted: false,
    subscribe: false,
};

export function RegistrationForm({ item, locale }: RegistrationFormProps) {
    const [fields, set_fields] = useState<RegistrationFields>(EMPTY_FORM);
    const [submitting, set_submitting] = useState(false);
    const [message, set_message] = useState<string>();
    const [failed, set_failed] = useState(false);

    const update_field = <Key extends keyof RegistrationFields>(
        key: Key,
        value: RegistrationFields[Key],
    ): void => {
        set_fields((current) => ({ ...current, [key]: value }));
    };

    const submit = async (event: SubmitEvent): Promise<void> => {
        event.preventDefault();
        set_submitting(true);
        set_message(undefined);
        set_failed(false);
        try {
            const result = await submit_registration(item, locale, fields);
            set_message(
                result.status === "waitlist"
                    ? `${translate(locale, "registration_success")} (${result.message})`
                    : translate(locale, "registration_success"),
            );
            set_fields(EMPTY_FORM);
        } catch (error) {
            set_failed(true);
            set_message(
                error instanceof Error
                    ? error.message
                    : translate(locale, "registration_error"),
            );
        } finally {
            set_submitting(false);
        }
    };

    return (
        <form class="form-card" onSubmit={submit}>
            <h2>{translate(locale, "register")}</h2>
            <label>
                <span>{translate(locale, "name")}</span>
                <input
                    autoComplete="name"
                    onInput={(event) => update_field("name", event.currentTarget.value)}
                    required
                    value={fields.name}
                />
            </label>
            <label>
                <span>{translate(locale, "email")}</span>
                <input
                    autoComplete="email"
                    inputMode="email"
                    onInput={(event) =>
                        update_field("email", event.currentTarget.value)
                    }
                    required
                    type="email"
                    value={fields.email}
                />
            </label>
            <label>
                <span>{translate(locale, "notes")}</span>
                <textarea
                    onInput={(event) =>
                        update_field("notes", event.currentTarget.value)
                    }
                    rows={3}
                    value={fields.notes}
                />
            </label>
            <label class="check-label">
                <input
                    checked={fields.privacy_accepted}
                    onChange={(event) =>
                        update_field("privacy_accepted", event.currentTarget.checked)
                    }
                    required
                    type="checkbox"
                />
                <span>{translate(locale, "privacy_accept")}</span>
            </label>
            <label class="check-label">
                <input
                    checked={fields.subscribe}
                    onChange={(event) =>
                        update_field("subscribe", event.currentTarget.checked)
                    }
                    type="checkbox"
                />
                <span>{translate(locale, "subscribe")}</span>
            </label>
            <button class="primary-button" disabled={submitting} type="submit">
                {translate(locale, "register")}
            </button>
            {message ? (
                <p aria-live="polite" class={failed ? "form-error" : "form-success"}>
                    {message}
                </p>
            ) : null}
        </form>
    );
}
