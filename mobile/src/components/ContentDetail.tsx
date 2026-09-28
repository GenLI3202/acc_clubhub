import DOMPurify from "dompurify";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";

import type { MobileContentItem, MobileLocale } from "../../../shared/mobile_content";
import { APP_CONFIG } from "../config";
import { format_item_date, registration_live_is_open } from "../lib/content";
import {
    get_event_status,
    type EventStatusResult,
    type RegistrationResult,
} from "../services/api";
import {
    add_event_to_calendar,
    open_external_url,
    share_content,
} from "../services/native";
import { translate } from "../i18n";
import { RegistrationForm } from "./RegistrationForm";

interface ContentDetailProps {
    favorite: boolean;
    item: MobileContentItem;
    locale: MobileLocale;
    on_back: () => void;
    on_message: (message: string) => void;
    on_registered: () => void;
    on_toggle_favorite: (item: MobileContentItem) => void;
    online: boolean;
    refresh_epoch: number;
}

type LiveState =
    { kind: "error" } | { kind: "idle" } | { kind: "loading" } | EventStatusResult;

const ALLOWED_BODY_TAGS = [
    "a",
    "blockquote",
    "br",
    "code",
    "del",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
];

export function ContentDetail({
    favorite,
    item,
    locale,
    on_back,
    on_message,
    on_registered,
    on_toggle_favorite,
    online,
    refresh_epoch,
}: ContentDetailProps) {
    const [live_state, set_live_state] = useState<LiveState>({ kind: "idle" });
    const [registration_result, set_registration_result] =
        useState<RegistrationResult>();
    const [registration_refresh, set_registration_refresh] = useState(0);
    const safe_body = useMemo(
        () =>
            DOMPurify.sanitize(item.body_html, {
                ALLOWED_ATTR: [
                    "alt",
                    "class",
                    "href",
                    "loading",
                    "rel",
                    "src",
                    "target",
                    "title",
                ],
                ALLOWED_TAGS: ALLOWED_BODY_TAGS,
                ALLOW_UNKNOWN_PROTOCOLS: false,
            }),
        [item.body_html],
    );

    useEffect(() => {
        let active = true;
        if (item.type !== "event") {
            set_live_state({ kind: "idle" });
            return (): void => {
                active = false;
            };
        }
        if (!online) {
            set_live_state({ kind: "error" });
            return (): void => {
                active = false;
            };
        }

        set_live_state((current) =>
            current.kind === "live" && current.value.slug === item.slug
                ? current
                : { kind: "loading" },
        );
        let in_flight = false;
        const refresh = (): void => {
            if (in_flight) return;
            in_flight = true;
            void get_event_status(item.slug)
                .then((result) => {
                    if (active) {
                        set_live_state(result);
                    }
                })
                .catch(() => {
                    if (active) {
                        set_live_state({ kind: "error" });
                    }
                })
                .finally(() => {
                    in_flight = false;
                });
        };
        refresh();
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") refresh();
        }, 30_000);
        return (): void => {
            active = false;
            window.clearInterval(timer);
        };
    }, [item.slug, item.type, online, refresh_epoch, registration_refresh]);

    useEffect(() => {
        set_registration_result(undefined);
    }, [item.slug]);

    const handle_registered = useCallback(
        (result: RegistrationResult): void => {
            set_registration_result(result);
            set_registration_refresh((current) => current + 1);
            on_registered();
        },
        [on_registered],
    );

    const live_event = live_state.kind === "live" ? live_state.value : undefined;
    const registration_link = item.metadata.registration_link;
    const registration_open =
        online &&
        live_state.kind === "live" &&
        registration_live_is_open(item, live_state);
    const date = format_item_date(item, locale, live_event?.event_date);

    const handle_body_click = (event: MouseEvent): void => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const link = target.closest("a");
        if (!link?.href) {
            return;
        }
        event.preventDefault();
        void open_external_url(link.href);
    };

    const run_action = async (action: () => Promise<void>): Promise<void> => {
        try {
            await action();
        } catch (error) {
            on_message(error instanceof Error ? error.message : "Action failed");
        }
    };

    return (
        <article class="detail-view">
            <div class="detail-view__toolbar">
                <button class="text-button" onClick={on_back} type="button">
                    ← {translate(locale, "back")}
                </button>
                <button
                    aria-label={translate(locale, favorite ? "unfavorite" : "favorite")}
                    aria-pressed={favorite}
                    class="icon-button"
                    onClick={() => on_toggle_favorite(item)}
                    type="button"
                >
                    <span aria-hidden="true">{favorite ? "★" : "☆"}</span>
                </button>
            </div>

            {item.cover_image ? (
                <img
                    alt={item.title}
                    class="detail-view__cover"
                    src={item.cover_image}
                />
            ) : null}
            <div class="detail-view__heading">
                <span class="eyebrow">{date}</span>
                <h1>{item.title}</h1>
                <p>{item.description}</p>
                <div class="detail-view__facts">
                    {item.metadata.location ? (
                        <span>⌖ {item.metadata.location}</span>
                    ) : null}
                    {item.metadata.distance_km ? (
                        <span>↔ {item.metadata.distance_km} km</span>
                    ) : null}
                    {item.metadata.elevation_m ? (
                        <span>↗ {item.metadata.elevation_m} m</span>
                    ) : null}
                </div>
            </div>

            <div class="action-row">
                <button
                    class="secondary-button"
                    onClick={() => run_action(() => share_content(item))}
                    type="button"
                >
                    {translate(locale, "share")}
                </button>
                {item.type === "event" ? (
                    <button
                        class="secondary-button"
                        onClick={() => run_action(() => add_event_to_calendar(item))}
                        type="button"
                    >
                        {translate(locale, "calendar")}
                    </button>
                ) : null}
            </div>

            <div
                class="rich-content"
                dangerouslySetInnerHTML={{ __html: safe_body }}
                onClick={handle_body_click}
            />

            {item.links.length > 0 ? (
                <div class="link-list">
                    {item.links.map((link) => (
                        <button
                            class="link-button"
                            key={`${link.kind}:${link.url}`}
                            onClick={() =>
                                run_action(() => open_external_url(link.url))
                            }
                            type="button"
                        >
                            {translate(locale, "open_link")} {link.kind} ↗
                        </button>
                    ))}
                </div>
            ) : null}

            {item.type === "event" ? (
                <section class="registration-section">
                    {live_event?.is_cancelled ? (
                        <div class="status-card status-card--error">
                            <strong>{translate(locale, "cancelled")}</strong>
                            {live_event.cancellation_reason ? (
                                <span>{live_event.cancellation_reason}</span>
                            ) : null}
                        </div>
                    ) : null}
                    {live_event?.available_spots === 0 ? (
                        <div class="status-card">{translate(locale, "event_full")}</div>
                    ) : null}
                    {typeof live_event?.available_spots === "number" &&
                    live_event.available_spots > 0 ? (
                        <div class="status-card">
                            {translate(locale, "spots_left", {
                                count: live_event.available_spots,
                            })}
                        </div>
                    ) : null}
                    {live_state.kind === "error" ? (
                        <div class="status-card status-card--error">
                            {translate(locale, "live_status_unavailable")}
                        </div>
                    ) : null}
                    {live_state.kind === "not_synced" ? (
                        <div class="status-card status-card--error">
                            {translate(locale, "event_not_synced")}
                        </div>
                    ) : null}
                    {registration_result ? (
                        <p aria-live="polite" class="form-success">
                            {registration_result.status === "waitlist"
                                ? translate(locale, "registration_waitlist", {
                                      count:
                                          registration_result.waitlist_position ?? "—",
                                  })
                                : translate(locale, "registration_success")}
                        </p>
                    ) : null}
                    {registration_link &&
                    registration_open &&
                    APP_CONFIG.stage !== "preview" ? (
                        <button
                            class="primary-button"
                            onClick={() =>
                                run_action(() => open_external_url(registration_link))
                            }
                            type="button"
                        >
                            {translate(locale, "register")} ↗
                        </button>
                    ) : null}
                    {!registration_link &&
                    registration_open &&
                    !registration_result &&
                    APP_CONFIG.stage !== "preview" ? (
                        <RegistrationForm
                            item={item}
                            locale={locale}
                            on_registered={handle_registered}
                        />
                    ) : null}
                    {!registration_open &&
                    live_state.kind !== "loading" &&
                    live_state.kind !== "error" &&
                    live_state.kind !== "not_synced" &&
                    !live_event?.is_cancelled ? (
                        <div class="status-card">
                            {translate(locale, "registration_closed")}
                        </div>
                    ) : null}
                </section>
            ) : null}
        </article>
    );
}
