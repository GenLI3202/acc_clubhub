import { useState } from "preact/hooks";

import type { MobileLocale } from "../../../shared/mobile_content";
import { translate } from "../i18n";
import { submit_subscription } from "../services/api";

interface SubscribeFormProps {
    locale: MobileLocale;
    online: boolean;
}

export function SubscribeForm({ locale, online }: SubscribeFormProps) {
    const [name, set_name] = useState("");
    const [email, set_email] = useState("");
    const [accepted, set_accepted] = useState(false);
    const [submitting, set_submitting] = useState(false);
    const [message, set_message] = useState<string>();
    const [failed, set_failed] = useState(false);

    const submit = async (event: SubmitEvent): Promise<void> => {
        event.preventDefault();
        set_submitting(true);
        set_message(undefined);
        set_failed(false);
        try {
            await submit_subscription(locale, name, email);
            set_message(translate(locale, "subscribe_success"));
            set_name("");
            set_email("");
            set_accepted(false);
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
            <h2>{translate(locale, "subscribe_action")}</h2>
            <p>{translate(locale, "subscribe_intro")}</p>
            <label>
                <span>{translate(locale, "name")}</span>
                <input
                    autoComplete="name"
                    onInput={(event) => set_name(event.currentTarget.value)}
                    required
                    value={name}
                />
            </label>
            <label>
                <span>{translate(locale, "email")}</span>
                <input
                    autoComplete="email"
                    inputMode="email"
                    onInput={(event) => set_email(event.currentTarget.value)}
                    required
                    type="email"
                    value={email}
                />
            </label>
            <label class="check-label">
                <input
                    checked={accepted}
                    onChange={(event) => set_accepted(event.currentTarget.checked)}
                    required
                    type="checkbox"
                />
                <span>{translate(locale, "privacy_accept")}</span>
            </label>
            <button
                class="primary-button"
                disabled={!online || submitting || !accepted}
                type="submit"
            >
                {translate(locale, "subscribe_action")}
            </button>
            {message ? (
                <p aria-live="polite" class={failed ? "form-error" : "form-success"}>
                    {message}
                </p>
            ) : null}
        </form>
    );
}
