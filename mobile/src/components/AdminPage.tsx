import { useEffect, useRef, useState } from "preact/hooks";

import type { MobileLocale } from "../../../shared/mobile_content";
import { translate } from "../i18n";
import {
    cancel_admin_event,
    admin_session_is_restoring,
    has_admin_session,
    list_admin_events,
    list_admin_rsvps,
    login_admin,
    logout_admin,
    notify_admin_event,
    AdminOutcomeUnknownError,
    reschedule_admin_event,
    subscribe_admin_session,
    update_admin_rsvp,
    type AdminEvent,
    type AdminRsvp,
    type DeliveryResult,
} from "../services/admin";

interface AdminPageProps {
    locale: MobileLocale;
    online: boolean;
    refresh_epoch: number;
}

const PAGE_SIZE = 20;
const REASONS = [
    "weather",
    "insufficient_staff",
    "unsafe_conditions",
    "other",
] as const;

function format_event_date(value: string | null, locale: MobileLocale): string {
    if (!value) {
        return "—";
    }
    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
    }).format(new Date(value));
}

export function AdminPage({ locale, online, refresh_epoch }: AdminPageProps) {
    const [authenticated, set_authenticated] = useState(has_admin_session());
    const [restoring, set_restoring] = useState(admin_session_is_restoring());
    const [email, set_email] = useState("");
    const [password, set_password] = useState("");
    const [events, set_events] = useState<AdminEvent[]>([]);
    const [event_total, set_event_total] = useState(0);
    const [event_offset, set_event_offset] = useState(0);
    const [selected_event, set_selected_event] = useState<AdminEvent>();
    const [rsvps, set_rsvps] = useState<AdminRsvp[]>([]);
    const [rsvp_total, set_rsvp_total] = useState(0);
    const [rsvp_offset, set_rsvp_offset] = useState(0);
    const [reason, set_reason] = useState<(typeof REASONS)[number]>("weather");
    const [departure_date, set_departure_date] = useState("");
    const [departure_time, set_departure_time] = useState("");
    const [busy, set_busy] = useState(false);
    const [error, set_error] = useState<string>();
    const [result, set_result] = useState<{
        mutation: string;
        delivery?: string;
    }>();
    const [reload, set_reload] = useState(0);
    const action_busy = useRef(false);

    useEffect(
        () =>
            subscribe_admin_session(() => {
                const signed_in = has_admin_session();
                set_restoring(admin_session_is_restoring());
                if (signed_in === authenticated) {
                    return;
                }
                set_authenticated(signed_in);
                set_events([]);
                set_selected_event(undefined);
                set_rsvps([]);
                set_error(undefined);
                set_result(undefined);
                set_event_offset(0);
                set_rsvp_offset(0);
                set_reload((current) => current + 1);
            }),
        [authenticated],
    );

    useEffect(() => {
        if (!authenticated || !online) {
            return;
        }
        let active = true;
        void list_admin_events(event_offset).then(
            (page) => {
                if (active) {
                    set_events(page.events);
                    set_event_total(page.total);
                    set_selected_event((current) =>
                        current
                            ? (page.events.find((event) => event.id === current.id) ??
                              current)
                            : undefined,
                    );
                }
            },
            (failure) => {
                if (active && has_admin_session()) {
                    set_error(
                        failure instanceof Error
                            ? failure.message
                            : translate(locale, "admin_load_error"),
                    );
                }
            },
        );
        return (): void => {
            active = false;
        };
    }, [authenticated, event_offset, locale, online, refresh_epoch, reload]);

    useEffect(() => {
        if (!authenticated || !online || !selected_event) {
            return;
        }
        let active = true;
        void list_admin_rsvps(selected_event.id, rsvp_offset).then(
            (page) => {
                if (active) {
                    set_rsvps(page.rsvps);
                    set_rsvp_total(page.total);
                }
            },
            (failure) => {
                if (active && has_admin_session()) {
                    set_error(
                        failure instanceof Error
                            ? failure.message
                            : translate(locale, "admin_load_error"),
                    );
                }
            },
        );
        return (): void => {
            active = false;
        };
    }, [
        authenticated,
        locale,
        online,
        refresh_epoch,
        reload,
        rsvp_offset,
        selected_event?.id,
    ]);

    const sign_in = async (event: SubmitEvent): Promise<void> => {
        event.preventDefault();
        if (action_busy.current || !online) {
            return;
        }
        action_busy.current = true;
        set_busy(true);
        set_error(undefined);
        try {
            await login_admin(email, password);
            set_password("");
        } catch (failure) {
            set_error(
                failure instanceof Error
                    ? failure.message
                    : translate(locale, "admin_login_error"),
            );
        } finally {
            action_busy.current = false;
            set_busy(false);
        }
    };

    const sign_out = async (): Promise<void> => {
        try {
            await logout_admin();
        } catch {
            set_error(translate(locale, "admin_logout_uncertain"));
        }
    };

    const run_action = async (
        description: string,
        label: string,
        action: () => Promise<DeliveryResult>,
    ): Promise<void> => {
        if (action_busy.current || !online || !window.confirm(description)) {
            return;
        }
        action_busy.current = true;
        set_busy(true);
        set_error(undefined);
        set_result(undefined);
        try {
            const outcome = await action();
            if (has_admin_session()) {
                set_result({
                    mutation: outcome.message ?? label,
                    delivery:
                        outcome.sent === undefined
                            ? undefined
                            : translate(locale, "admin_delivery", {
                                  sent: outcome.sent,
                                  skipped: outcome.skipped ?? 0,
                                  failed: outcome.failed ?? 0,
                              }),
                });
                set_reload((current) => current + 1);
            }
        } catch (failure) {
            if (has_admin_session()) {
                set_error(
                    failure instanceof AdminOutcomeUnknownError
                        ? translate(locale, "admin_result_unknown")
                        : failure instanceof Error
                          ? failure.message
                          : translate(locale, "admin_result_unknown"),
                );
            }
        } finally {
            action_busy.current = false;
            set_busy(false);
        }
    };

    const select_event = (event: AdminEvent): void => {
        set_selected_event(event);
        set_rsvps([]);
        set_rsvp_offset(0);
        set_result(undefined);
        set_error(undefined);
    };

    return (
        <section class="admin-page">
            <div class="section-heading">
                <span class="eyebrow">ACC · ADMIN</span>
                <h1>{translate(locale, "manage")}</h1>
            </div>
            {!online ? (
                <p class="status-card">{translate(locale, "admin_offline")}</p>
            ) : null}
            {error ? (
                <p aria-live="polite" class="form-error">
                    {error}
                </p>
            ) : null}
            {result ? (
                <div aria-live="polite" class="form-success">
                    <p>{result.mutation}</p>
                    {result.delivery ? <p>{result.delivery}</p> : null}
                </div>
            ) : null}

            {!authenticated && restoring ? (
                <p aria-live="polite" class="status-card">
                    {translate(locale, "admin_restoring")}
                </p>
            ) : !authenticated ? (
                <form class="form-card" onSubmit={sign_in}>
                    <label>
                        <span>{translate(locale, "email")}</span>
                        <input
                            autoComplete="username"
                            onInput={(event) => set_email(event.currentTarget.value)}
                            required
                            type="email"
                            value={email}
                        />
                    </label>
                    <label>
                        <span>{translate(locale, "admin_password")}</span>
                        <input
                            autoComplete="current-password"
                            onInput={(event) => set_password(event.currentTarget.value)}
                            required
                            type="password"
                            value={password}
                        />
                    </label>
                    <button
                        class="primary-button"
                        disabled={busy || !online}
                        type="submit"
                    >
                        {translate(locale, "admin_login")}
                    </button>
                </form>
            ) : (
                <>
                    <div class="admin-toolbar">
                        <button
                            class="text-button"
                            onClick={() => void sign_out()}
                            type="button"
                        >
                            {translate(locale, "admin_logout")}
                        </button>
                        <button
                            class="text-button"
                            disabled={busy || !online}
                            onClick={() => set_reload((current) => current + 1)}
                            type="button"
                        >
                            {translate(locale, "refresh")}
                        </button>
                    </div>
                    {selected_event ? (
                        <>
                            <button
                                class="text-button"
                                onClick={() => set_selected_event(undefined)}
                                type="button"
                            >
                                ← {translate(locale, "back")}
                            </button>
                            <h2>{selected_event.title}</h2>
                            <p>
                                {format_event_date(selected_event.event_date, locale)}
                            </p>
                            <p>
                                {translate(locale, "admin_roster_count", {
                                    count: rsvp_total,
                                })}
                            </p>
                            <div class="admin-actions">
                                <label>
                                    {translate(locale, "admin_reason")}
                                    <select
                                        onChange={(event) =>
                                            set_reason(
                                                event.currentTarget
                                                    .value as typeof reason,
                                            )
                                        }
                                        value={reason}
                                    >
                                        {REASONS.map((value) => (
                                            <option key={value} value={value}>
                                                {translate(
                                                    locale,
                                                    `admin_reason_${value}`,
                                                )}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    {translate(locale, "admin_new_date")}
                                    <input
                                        onInput={(event) =>
                                            set_departure_date(
                                                event.currentTarget.value,
                                            )
                                        }
                                        type="date"
                                        value={departure_date}
                                    />
                                </label>
                                <label>
                                    {translate(locale, "admin_new_time")}
                                    <input
                                        onInput={(event) =>
                                            set_departure_time(
                                                event.currentTarget.value,
                                            )
                                        }
                                        type="time"
                                        value={departure_time}
                                    />
                                </label>
                                <button
                                    class="secondary-button"
                                    disabled={
                                        busy ||
                                        !online ||
                                        !departure_date ||
                                        !departure_time ||
                                        !selected_event.event_date
                                    }
                                    onClick={() =>
                                        void run_action(
                                            `${translate(locale, "admin_confirm_reschedule")}: ${selected_event.title}\n${format_event_date(selected_event.event_date, locale)} → ${departure_date} ${departure_time} Europe/Berlin\n${translate(locale, `admin_reason_${reason}`)}`,
                                            translate(locale, "admin_reschedule"),
                                            () =>
                                                reschedule_admin_event(
                                                    selected_event.id,
                                                    reason,
                                                    departure_date,
                                                    departure_time,
                                                    selected_event.event_date ?? "",
                                                ),
                                        )
                                    }
                                    type="button"
                                >
                                    {translate(locale, "admin_reschedule")}
                                </button>
                                <button
                                    class="secondary-button"
                                    disabled={
                                        busy ||
                                        !online ||
                                        Boolean(selected_event.cancelled_at)
                                    }
                                    onClick={() =>
                                        void run_action(
                                            `${translate(locale, "admin_confirm_cancel")}: ${selected_event.title}\n${translate(locale, `admin_reason_${reason}`)}\n${translate(locale, "admin_roster_count", { count: rsvp_total })}`,
                                            translate(locale, "admin_cancel_event"),
                                            () =>
                                                cancel_admin_event(
                                                    selected_event.id,
                                                    reason,
                                                ),
                                        )
                                    }
                                    type="button"
                                >
                                    {translate(locale, "admin_cancel_event")}
                                </button>
                                <button
                                    class="secondary-button"
                                    disabled={
                                        busy ||
                                        !online ||
                                        Boolean(selected_event.cancelled_at)
                                    }
                                    onClick={() =>
                                        void run_action(
                                            `${translate(locale, "admin_confirm_notify")}: ${selected_event.title}\n${translate(locale, "admin_roster_count", { count: rsvp_total })}`,
                                            translate(locale, "admin_notify"),
                                            () => notify_admin_event(selected_event.id),
                                        )
                                    }
                                    type="button"
                                >
                                    {translate(locale, "admin_notify")}
                                </button>
                            </div>
                            <div class="admin-list">
                                {rsvps.map((rsvp) => (
                                    <article class="admin-row" key={rsvp.id}>
                                        <strong>{rsvp.name}</strong>
                                        <span>{rsvp.email}</span>
                                        <span>
                                            {rsvp.status} ·{" "}
                                            {rsvp.checked_in_at
                                                ? translate(locale, "admin_checked_in")
                                                : translate(
                                                      locale,
                                                      "admin_not_checked_in",
                                                  )}
                                        </span>
                                        <div class="action-row">
                                            {rsvp.status === "confirmed" ? (
                                                <button
                                                    class="secondary-button"
                                                    disabled={busy || !online}
                                                    onClick={() =>
                                                        void run_action(
                                                            `${rsvp.name} (${rsvp.email}) · ${rsvp.checked_in_at ? translate(locale, "admin_undo_check_in") : translate(locale, "admin_check_in")}`,
                                                            translate(
                                                                locale,
                                                                rsvp.checked_in_at
                                                                    ? "admin_undo_check_in"
                                                                    : "admin_check_in",
                                                            ),
                                                            () =>
                                                                update_admin_rsvp(
                                                                    selected_event.id,
                                                                    rsvp.id,
                                                                    rsvp.checked_in_at
                                                                        ? "check-in/undo"
                                                                        : "check-in",
                                                                ),
                                                        )
                                                    }
                                                    type="button"
                                                >
                                                    {translate(
                                                        locale,
                                                        rsvp.checked_in_at
                                                            ? "admin_undo_check_in"
                                                            : "admin_check_in",
                                                    )}
                                                </button>
                                            ) : null}
                                            <button
                                                class="secondary-button"
                                                disabled={busy || !online}
                                                onClick={() =>
                                                    void run_action(
                                                        `${rsvp.name} (${rsvp.email}) · ${rsvp.status === "cancelled" ? translate(locale, "admin_restore_rsvp") : translate(locale, "admin_cancel_rsvp")}`,
                                                        translate(
                                                            locale,
                                                            rsvp.status === "cancelled"
                                                                ? "admin_restore_rsvp"
                                                                : "admin_cancel_rsvp",
                                                        ),
                                                        () =>
                                                            update_admin_rsvp(
                                                                selected_event.id,
                                                                rsvp.id,
                                                                rsvp.status ===
                                                                    "cancelled"
                                                                    ? "restore"
                                                                    : "cancel",
                                                            ),
                                                    )
                                                }
                                                type="button"
                                            >
                                                {translate(
                                                    locale,
                                                    rsvp.status === "cancelled"
                                                        ? "admin_restore_rsvp"
                                                        : "admin_cancel_rsvp",
                                                )}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            {rsvp_total > PAGE_SIZE ? (
                                <div class="admin-pager">
                                    <button
                                        disabled={rsvp_offset === 0}
                                        onClick={() =>
                                            set_rsvp_offset(
                                                Math.max(0, rsvp_offset - PAGE_SIZE),
                                            )
                                        }
                                        type="button"
                                    >
                                        ←
                                    </button>
                                    <span>
                                        {rsvp_offset + 1}–
                                        {Math.min(rsvp_total, rsvp_offset + PAGE_SIZE)}{" "}
                                        / {rsvp_total}
                                    </span>
                                    <button
                                        disabled={rsvp_offset + PAGE_SIZE >= rsvp_total}
                                        onClick={() =>
                                            set_rsvp_offset(rsvp_offset + PAGE_SIZE)
                                        }
                                        type="button"
                                    >
                                        →
                                    </button>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <h2>{translate(locale, "admin_events")}</h2>
                            <div class="admin-list">
                                {events.map((event) => (
                                    <button
                                        class="admin-row admin-row--button"
                                        key={event.id}
                                        onClick={() => select_event(event)}
                                        type="button"
                                    >
                                        <strong>{event.title}</strong>
                                        <span>
                                            {format_event_date(
                                                event.event_date,
                                                locale,
                                            )}
                                        </span>
                                        <span>
                                            {translate(locale, "admin_event_counts", {
                                                confirmed: event.confirmed_count,
                                                waitlist: event.waitlist_count,
                                            })}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {event_total > PAGE_SIZE ? (
                                <div class="admin-pager">
                                    <button
                                        disabled={event_offset === 0}
                                        onClick={() =>
                                            set_event_offset(
                                                Math.max(0, event_offset - PAGE_SIZE),
                                            )
                                        }
                                        type="button"
                                    >
                                        ←
                                    </button>
                                    <span>
                                        {event_offset + 1}–
                                        {Math.min(
                                            event_total,
                                            event_offset + PAGE_SIZE,
                                        )}{" "}
                                        / {event_total}
                                    </span>
                                    <button
                                        disabled={
                                            event_offset + PAGE_SIZE >= event_total
                                        }
                                        onClick={() =>
                                            set_event_offset(event_offset + PAGE_SIZE)
                                        }
                                        type="button"
                                    >
                                        →
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </>
            )}
        </section>
    );
}
