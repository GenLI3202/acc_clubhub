import { useRef, useState } from "preact/hooks";

import type { MobileContentItem, MobileLocale } from "../../../shared/mobile_content";
import {
    IndeterminateRegistrationError,
    submit_registration,
    type RegistrationFields,
    type RegistrationResult,
} from "../services/api";
import { APP_CONFIG } from "../config";
import { open_external_url } from "../services/native";
import { translate } from "../i18n";

interface RegistrationFormProps {
    item: MobileContentItem;
    locale: MobileLocale;
    on_registered: (result: RegistrationResult) => void;
}

const EMPTY_FORM: RegistrationFields = {
    email: "",
    insurance_accepted: false,
    name: "",
    notes: "",
    privacy_accepted: false,
    subscribe: false,
};

export function RegistrationForm({
    item,
    locale,
    on_registered,
}: RegistrationFormProps) {
    const [fields, set_fields] = useState<RegistrationFields>(EMPTY_FORM);
    const [submitting, set_submitting] = useState(false);
    const [unresolved, set_unresolved] = useState(false);
    const submitting_ref = useRef(false);
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
        if (submitting_ref.current || unresolved) {
            return;
        }
        submitting_ref.current = true;
        set_submitting(true);
        set_message(undefined);
        set_failed(false);
        try {
            if (item.metadata.acc_official_ride && !fields.insurance_accepted) {
                set_failed(true);
                set_message(translate(locale, "insurance_required"));
                return;
            }
            const result = await submit_registration(item, locale, fields);
            set_fields(EMPTY_FORM);
            on_registered(result);
        } catch (error) {
            set_failed(true);
            if (error instanceof IndeterminateRegistrationError) {
                set_unresolved(true);
            }
            set_message(
                error instanceof IndeterminateRegistrationError
                    ? translate(locale, "registration_unknown")
                    : error instanceof Error
                      ? error.message
                      : translate(locale, "registration_error"),
            );
        } finally {
            submitting_ref.current = false;
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
            {item.metadata.acc_official_ride ? (
                <label class="check-label">
                    <input
                        checked={fields.insurance_accepted}
                        onChange={(event) =>
                            update_field(
                                "insurance_accepted",
                                event.currentTarget.checked,
                            )
                        }
                        required
                        type="checkbox"
                    />
                    <span>
                        {translate(locale, "insurance_accept")}{" "}
                        <button
                            class="text-button"
                            onClick={() =>
                                void open_external_url(
                                    `${APP_CONFIG.site_url}/${locale}/insurance`,
                                )
                            }
                            type="button"
                        >
                            {translate(locale, "insurance")}
                        </button>
                    </span>
                </label>
            ) : null}
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
            <button
                class="primary-button"
                disabled={submitting || unresolved}
                type="submit"
            >
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
