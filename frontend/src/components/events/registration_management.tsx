import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Locale } from "../../lib/i18n";
import "./registration_management.css";

export interface RegistrationData {
    your_name: string;
    your_status: "confirmed" | "waitlist" | "cancelled";
    can_cancel: boolean;
    total_confirmed: number;
    participants: { name: string }[];
}

interface Props {
    lang: Locale;
    api_url: string;
    slug: string;
    token: string;
    initial_data: RegistrationData | null;
}

const COPY = {
    zh: {
        title: "我的报名", confirmed: "已确认", waitlist: "候补中",
        cancelled: "已取消报名", cancel: "取消我的报名",
        note: "临时有事来不了？出发前可在这里取消自己的报名，释放名额。",
        confirm: "确认取消本次报名？取消后将释放你的名额；重新报名需视剩余名额而定。",
        yes: "确认取消报名", keep: "保留报名", busy: "正在取消…",
        success: "你的本次报名已取消。期待下次一起骑行！",
        closed: "活动已出发或你已签到，如需调整报名，请联系俱乐部。",
        invalid: "无法读取报名信息。请使用最新报名邮件中的个人链接，或刷新后重试。",
        error: "取消失败，请重试。如仍无法取消，请联系俱乐部。",
        contact: "联系俱乐部", people: "参与名单", empty: "暂无已确认参与者。",
    },
    en: {
        title: "My registration", confirmed: "Confirmed", waitlist: "Waitlisted",
        cancelled: "Registration cancelled", cancel: "Cancel my registration",
        note: "Can't make it? Cancel your own registration here before departure "
            + "to free up your place.",
        confirm: "Cancel this registration? Your place will be released. "
            + "Registering again depends on availability.",
        yes: "Confirm cancellation", keep: "Keep my registration", busy: "Cancelling…",
        success: "Your registration has been cancelled. See you on another ride!",
        closed: "The ride has started or you have checked in. "
            + "Contact the club to change your registration.",
        invalid: "We couldn't load your registration. Use the personal link in "
            + "your latest registration email, or refresh to try again.",
        error: "Cancellation failed. Please retry or contact the club for help.",
        contact: "Contact the club", people: "Participants",
        empty: "No confirmed participants yet.",
    },
    de: {
        title: "Meine Anmeldung", confirmed: "Bestätigt", waitlist: "Warteliste",
        cancelled: "Anmeldung storniert", cancel: "Meine Anmeldung stornieren",
        note: "Du kannst nicht teilnehmen? Storniere hier vor dem Start deine "
            + "Anmeldung, um deinen Platz freizugeben.",
        confirm: "Diese Anmeldung stornieren? Dein Platz wird freigegeben. "
            + "Eine erneute Anmeldung hängt von freien Plätzen ab.",
        yes: "Stornierung bestätigen", keep: "Anmeldung behalten",
        busy: "Wird storniert…",
        success: "Deine Anmeldung wurde storniert. Bis zur nächsten Ausfahrt!",
        closed: "Die Ausfahrt hat begonnen oder du bist eingecheckt. "
            + "Für Änderungen kontaktiere bitte den Club.",
        invalid: "Deine Anmeldung konnte nicht geladen werden. Nutze den "
            + "persönlichen Link aus deiner neuesten Anmeldebestätigung "
            + "oder lade die Seite neu.",
        error: "Stornierung fehlgeschlagen. Bitte versuche es erneut "
            + "oder kontaktiere den Club.",
        contact: "Club kontaktieren", people: "Teilnehmerliste",
        empty: "Noch keine bestätigten Teilnehmenden.",
    },
};

export default function RegistrationManagement({
    lang, api_url, slug, token, initial_data,
}: Props): JSX.Element {
    const copy = COPY[lang];
    const [data, set_data] = useState(initial_data);
    const [confirming, set_confirming] = useState(false);
    const [busy, set_busy] = useState(false);
    const [error, set_error] = useState("");
    const request_pending = useRef(false);
    const cancel_button = useRef<HTMLButtonElement>(null);
    const keep_button = useRef<HTMLButtonElement>(null);
    const status_region = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (confirming) keep_button.current?.focus();
    }, [confirming]);

    async function cancel_registration(): Promise<void> {
        if (request_pending.current) return;
        request_pending.current = true;
        set_busy(true);
        set_error("");
        try {
            const response = await fetch(
                `${api_url}/api/events/${encodeURIComponent(slug)}/registration/cancel`,
                {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }), cache: "no-store",
                    referrerPolicy: "no-referrer",
                },
            );
            if (!response.ok) {
                set_error(response.status === 409 ? copy.closed : copy.error);
                return;
            }
            const result = await response.json();
            if (result.success !== true || result.status !== "cancelled") {
                set_error(copy.error);
                return;
            }
            set_data(data ? { ...data, your_status: "cancelled" } : null);
            set_confirming(false);
            // Keep keyboard focus on the result when the action buttons disappear.
            requestAnimationFrame(() => status_region.current?.focus());
        } catch {
            set_error(copy.error);
        } finally {
            request_pending.current = false;
            set_busy(false);
        }
    }

    return (
        <section id="registration-management" class="registration-management"
            aria-labelledby="registration-management-title">
            <h2 id="registration-management-title">{copy.title}</h2>
            {!data ? <p role="alert">{copy.invalid}</p> : <>
                <p>{data.your_name} · <strong>{copy[data.your_status]}</strong></p>
                <p ref={status_region} role="status" tabIndex={-1}>
                    {data.your_status === "cancelled" ? copy.success
                        : data.can_cancel ? copy.note : copy.closed}
                </p>
                {data.can_cancel && data.your_status !== "cancelled" && (
                    confirming ? <div role="group" aria-label={copy.cancel}>
                        <p>{copy.confirm}</p>
                        <div class="registration-actions">
                            <button type="button" disabled={busy}
                                onClick={cancel_registration}>
                                {busy ? copy.busy : copy.yes}
                            </button>
                            <button type="button" ref={keep_button}
                                class="secondary" disabled={busy}
                                onClick={() => {
                                    set_confirming(false);
                                    set_error("");
                                    requestAnimationFrame(() => {
                                        cancel_button.current?.focus();
                                    });
                                }}>{copy.keep}</button>
                        </div>
                    </div> : <button type="button" ref={cancel_button}
                        onClick={() => set_confirming(true)}>{copy.cancel}</button>
                )}
                {error && <p role="alert">{error}</p>}
                {data.your_status !== "cancelled" && <details>
                    <summary>{copy.people} ({data.total_confirmed})</summary>
                    {data.participants.length ? <ul>
                        {data.participants.map((person, index) => (
                            <li key={index}>{person.name}</li>
                        ))}
                    </ul> : <p>{copy.empty}</p>}
                </details>}
            </>}
            <a href="mailto:letusride@across-cc.de">{copy.contact}</a>
        </section>
    );
}
