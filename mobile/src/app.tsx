import { App as CapacitorApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

import type {
    MobileContentFeed,
    MobileContentItem,
    MobileLocale,
} from "../../shared/mobile_content";
import { BottomNavigation } from "./components/BottomNavigation";
import { AdminPage } from "./components/AdminPage";
import { AppUpdates } from "./components/AppUpdates";
import { ContentCard } from "./components/ContentCard";
import { ContentDetail } from "./components/ContentDetail";
import { PageHero } from "./components/PageHero";
import { SubscribeForm } from "./components/SubscribeForm";
import { APP_CONFIG } from "./config";
import { use_edge_swipe_back } from "./hooks/use_edge_swipe_back";
import { use_pull_to_refresh } from "./hooks/use_pull_to_refresh";
import { translate } from "./i18n";
import {
    filter_items_for_view,
    sort_mobile_items,
    split_event_items,
    type AppView,
} from "./lib/content";
import { create_page_hero, section_title } from "./lib/page_hero";
import { get_public_event_statuses, type EventLiveState } from "./services/api";
import { restore_admin_session } from "./services/admin";
import {
    ContentUpdateRequiredError,
    load_content_feed,
    type ContentSource,
} from "./services/content";
import { check_for_live_update } from "./services/live_update";
import {
    listen_for_deep_links,
    open_external_url,
    parse_content_deep_link,
    type ContentDeepLink,
} from "./services/native";
import {
    load_favorites,
    load_locale,
    save_favorites,
    save_locale,
} from "./services/preferences";

function browser_locale(): MobileLocale {
    const language = navigator.language.toLowerCase();
    if (language.startsWith("de")) {
        return "de";
    }
    if (language.startsWith("en")) {
        return "en";
    }
    return "zh";
}

function source_message(source: ContentSource, locale: MobileLocale): string {
    if (source === "network") {
        return translate(locale, "content_live");
    }
    if (source === "cache") {
        return translate(locale, "content_cached");
    }
    return translate(locale, "bundled_content");
}

interface LoadFeedOptions {
    announce?: boolean;
    background?: boolean;
}

export function App() {
    const [locale, set_locale] = useState<MobileLocale>(browser_locale());
    const [feed, set_feed] = useState<MobileContentFeed>();
    const [source, set_source] = useState<ContentSource>();
    const [loading, set_loading] = useState(true);
    const [refreshing, set_refreshing] = useState(false);
    const [error, set_error] = useState<string>();
    const [active_view, set_active_view] = useState<AppView>("events");
    const [selected_item, set_selected_item] = useState<MobileContentItem>();
    const [favorites, set_favorites] = useState<Set<string>>(new Set());
    const [query, set_query] = useState("");
    const [online, set_online] = useState(navigator.onLine);
    const [message, set_message] = useState<string>();
    const [pending_link, set_pending_link] = useState<ContentDeepLink>();
    const [live_refresh_epoch, set_live_refresh_epoch] = useState(0);
    const [live_events, set_live_events] = useState<Record<string, EventLiveState>>({});
    const current_feed = useRef<MobileContentFeed>();
    const feed_request_id = useRef(0);
    const list_scroll_y = useRef(0);
    const app_header_ref = useRef<HTMLElement>(null);
    const close_item = useCallback((): void => {
        set_selected_item(undefined);
        window.requestAnimationFrame(() => window.scrollTo(0, list_scroll_y.current));
    }, []);
    use_edge_swipe_back(Boolean(selected_item), close_item);

    useEffect(() => {
        const header = app_header_ref.current;
        if (!header) {
            return;
        }
        const update_header = (): void => {
            const scroll_y = Math.max(0, window.scrollY);
            header.classList.toggle("app-header--scrolled", scroll_y > 12);
            if (!selected_item && active_view !== "manage") {
                const opacity = Math.max(0, 1 - scroll_y / 44);
                header.style.opacity = String(opacity);
                header.style.pointerEvents = opacity < 0.1 ? "none" : "";
            } else {
                header.style.opacity = "";
                header.style.pointerEvents = "";
            }
        };
        update_header();
        window.addEventListener("scroll", update_header, { passive: true });
        return (): void => {
            window.removeEventListener("scroll", update_header);
        };
    }, [active_view, selected_item]);

    const load_feed = useCallback(
        async (
            target_locale: MobileLocale,
            options: LoadFeedOptions = {},
        ): Promise<void> => {
            const request_id = feed_request_id.current + 1;
            feed_request_id.current = request_id;
            if (!options.background) {
                set_loading(true);
                set_error(undefined);
                set_live_refresh_epoch((current) => current + 1);
            }

            try {
                const result = await load_content_feed(target_locale);
                if (request_id !== feed_request_id.current) {
                    return;
                }
                const keep_existing =
                    options.background &&
                    result.source !== "network" &&
                    current_feed.current?.locale === target_locale;
                if (!keep_existing) {
                    current_feed.current = result.feed;
                    set_feed(result.feed);
                    set_source(result.source);
                }
                if (options.background) {
                    set_live_refresh_epoch((current) => current + 1);
                }
                set_error(undefined);
                if (options.announce && result.source === "network") {
                    set_message(translate(target_locale, "refreshed"));
                    window.setTimeout(() => set_message(undefined), 4_000);
                }
            } catch (load_error) {
                if (request_id !== feed_request_id.current) {
                    return;
                }
                current_feed.current = undefined;
                set_feed(undefined);
                set_source(undefined);
                set_error(
                    load_error instanceof ContentUpdateRequiredError
                        ? translate(target_locale, "update_required")
                        : load_error instanceof Error
                          ? load_error.message
                          : translate(target_locale, "no_content"),
                );
            } finally {
                if (request_id === feed_request_id.current) {
                    set_loading(false);
                }
            }
        },
        [],
    );

    const pull_refresh = use_pull_to_refresh({
        disabled: !online || loading,
        on_refresh: async (): Promise<void> => {
            set_refreshing(true);
            try {
                await load_feed(locale, {
                    announce: true,
                    background: Boolean(feed),
                });
            } finally {
                set_refreshing(false);
            }
        },
        refreshing,
    });

    useEffect(() => {
        void restore_admin_session();
        void Promise.all([load_locale(), load_favorites()]).then(
            ([saved_locale, saved_favorites]) => {
                if (saved_locale) {
                    set_locale(saved_locale);
                }
                set_favorites(saved_favorites);
            },
        );
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
        void save_locale(locale);
        void load_feed(locale);
    }, [load_feed, locale]);

    useEffect(() => {
        let previous_connection: boolean | undefined;
        let remove_listener: (() => Promise<void>) | undefined;
        void Network.getStatus().then((status) => {
            previous_connection = status.connected;
            set_online(status.connected);
        });
        void Network.addListener("networkStatusChange", (status) => {
            const reconnected = previous_connection === false && status.connected;
            previous_connection = status.connected;
            set_online(status.connected);
            if (reconnected) {
                void restore_admin_session();
                void check_for_live_update();
            }
        }).then((listener) => {
            remove_listener = async (): Promise<void> => listener.remove();
        });
        return (): void => {
            void remove_listener?.();
        };
    }, []);

    useEffect(() => {
        let remove_listener: (() => Promise<void>) | undefined;
        void CapacitorApp.addListener("appStateChange", (state) => {
            if (state.isActive) {
                void restore_admin_session();
                void check_for_live_update();
            }
        }).then((listener) => {
            remove_listener = async (): Promise<void> => listener.remove();
        });
        return (): void => {
            void remove_listener?.();
        };
    }, []);

    useEffect(() => {
        const handle_link = (link: ContentDeepLink): void => {
            set_pending_link(link);
            if (link.locale !== locale) {
                set_locale(link.locale);
            }
        };
        let remove_listener: (() => Promise<void>) | undefined;
        void listen_for_deep_links(handle_link).then((remove) => {
            remove_listener = remove;
        });
        void CapacitorApp.getLaunchUrl().then((result) => {
            if (!result?.url) {
                return;
            }
            const link = parse_content_deep_link(result.url);
            if (link) {
                handle_link(link);
            }
        });
        return (): void => {
            void remove_listener?.();
        };
    }, [locale]);

    useEffect(() => {
        if (!feed || !pending_link || feed.locale !== pending_link.locale) {
            return;
        }
        const item = feed.items.find(
            (candidate) =>
                candidate.type === pending_link.type &&
                candidate.slug === pending_link.slug,
        );
        if (item) {
            set_selected_item(item);
            set_pending_link(undefined);
        }
    }, [feed, pending_link]);

    useEffect(() => {
        if (!feed || !selected_item) {
            return;
        }
        const updated_item = feed.items.find(
            (candidate) => candidate.id === selected_item.id,
        );
        if (updated_item && updated_item !== selected_item) {
            set_selected_item(updated_item);
        }
    }, [feed, selected_item]);

    useEffect(() => {
        let remove_listener: (() => Promise<void>) | undefined;
        void CapacitorApp.addListener("backButton", () => {
            if (selected_item) {
                close_item();
            }
        }).then((listener) => {
            remove_listener = async (): Promise<void> => listener.remove();
        });
        return (): void => {
            void remove_listener?.();
        };
    }, [close_item, selected_item]);

    const all_items = useMemo(
        () => sort_mobile_items(feed?.items ?? [], live_events),
        [feed, live_events],
    );
    const scoped_items = useMemo(
        () => filter_items_for_view(all_items, active_view),
        [active_view, all_items],
    );
    const visible_items = useMemo(() => {
        const normalized_query = query.trim().toLocaleLowerCase(locale);
        if (!normalized_query) {
            return scoped_items;
        }
        return scoped_items.filter((item) =>
            [item.title, item.description, item.metadata.location]
                .filter(Boolean)
                .some((value) =>
                    value?.toLocaleLowerCase(locale).includes(normalized_query),
                ),
        );
    }, [locale, query, scoped_items]);
    const event_groups = useMemo(
        () => split_event_items(visible_items, live_events),
        [live_events, visible_items],
    );
    useEffect(() => {
        if (active_view !== "events" || !online || !feed) {
            return;
        }
        let active = true;
        void get_public_event_statuses()
            .then((events) => {
                if (!active) {
                    return;
                }
                const published_slugs = new Set(
                    feed.items
                        .filter((item) => item.type === "event")
                        .map((item) => item.slug),
                );
                set_live_events(
                    Object.fromEntries(
                        events
                            .filter((event) => published_slugs.has(event.slug))
                            .map((event) => [event.slug, event]),
                    ),
                );
            })
            .catch(() => {
                if (active) {
                    set_live_events({});
                }
            });
        return (): void => {
            active = false;
        };
    }, [active_view, feed, live_refresh_epoch]);
    const hero_content = useMemo(
        () =>
            create_page_hero(
                active_view,
                scoped_items,
                locale,
                APP_CONFIG.site_url,
                live_events,
            ),
        [active_view, live_events, locale, scoped_items],
    );

    const select_view = (view: AppView): void => {
        set_active_view(view);
        set_selected_item(undefined);
        set_query("");
        window.scrollTo(0, 0);
    };

    const open_item = (item: MobileContentItem): void => {
        list_scroll_y.current = window.scrollY;
        set_selected_item(item);
        window.requestAnimationFrame(() => window.scrollTo(0, 0));
    };

    const toggle_favorite = (item: MobileContentItem): void => {
        const next = new Set(favorites);
        if (next.has(item.id)) {
            next.delete(item.id);
        } else {
            next.add(item.id);
        }
        set_favorites(next);
        void save_favorites(next);
    };

    const show_message = (next_message: string): void => {
        set_message(next_message);
        window.setTimeout(() => set_message(undefined), 4_000);
    };

    const open_site_page = (path: string): void => {
        void open_external_url(`${APP_CONFIG.site_url}/${locale}/${path}`);
    };

    const activate_hero = (): void => {
        if (hero_content.action_target === "content" && hero_content.item) {
            open_item(hero_content.item);
        } else if (hero_content.action_target === "membership") {
            open_site_page("membership");
        }
    };

    return (
        <div class="app-shell">
            <header
                class={`app-header${selected_item ? " app-header--detail" : active_view === "manage" ? "" : " app-header--hero"}`}
                ref={app_header_ref}
            >
                {selected_item ? (
                    <button
                        aria-label={`${translate(locale, "back")}: ${translate(locale, active_view)}`}
                        class="detail-back-button"
                        onClick={close_item}
                        type="button"
                    >
                        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                        <span>{translate(locale, active_view)}</span>
                    </button>
                ) : (
                    <button
                        aria-label={translate(locale, "events")}
                        class="brand-button"
                        onClick={() => select_view("events")}
                        type="button"
                    >
                        <img alt="ACC ClubHub" src="/app-logo.png" />
                        <span>{translate(locale, "app_name")}</span>
                    </button>
                )}
                {selected_item ? (
                    <button
                        aria-label={translate(
                            locale,
                            favorites.has(selected_item.id) ? "unfavorite" : "favorite",
                        )}
                        aria-pressed={favorites.has(selected_item.id)}
                        class="icon-button header-favorite-button"
                        onClick={() => toggle_favorite(selected_item)}
                        type="button"
                    >
                        <span aria-hidden="true">
                            {favorites.has(selected_item.id) ? "★" : "☆"}
                        </span>
                    </button>
                ) : (
                    <button
                        aria-label={translate(locale, "website")}
                        class="text-button"
                        onClick={() => open_site_page("")}
                        type="button"
                    >
                        {translate(locale, "website")} ↗
                    </button>
                )}
                <label class="language-picker">
                    <span class="sr-only">{translate(locale, "language")}</span>
                    <select
                        aria-label={translate(locale, "language")}
                        onChange={(event) =>
                            set_locale(event.currentTarget.value as MobileLocale)
                        }
                        value={locale}
                    >
                        <option value="zh">中文</option>
                        <option value="en">EN</option>
                        <option value="de">DE</option>
                    </select>
                </label>
            </header>

            {APP_CONFIG.stage === "staging" ? (
                <div class="connection-banner" role="status">
                    {translate(locale, "staging_build")}
                </div>
            ) : null}
            {APP_CONFIG.stage === "preview" ? (
                <div class="connection-banner" role="status">
                    {translate(locale, "preview_build")}
                </div>
            ) : null}

            <div
                aria-hidden={pull_refresh.state === "idle" ? "true" : undefined}
                aria-live="polite"
                class={`pull-refresh pull-refresh--${pull_refresh.state}`}
                role="status"
                style={{ height: `${pull_refresh.distance}px` }}
            >
                <span aria-hidden="true" class="pull-refresh__icon">
                    ↓
                </span>
                <span>
                    {translate(
                        locale,
                        pull_refresh.state === "ready"
                            ? "release_to_refresh"
                            : pull_refresh.state === "refreshing"
                              ? "refreshing"
                              : "pull_to_refresh",
                    )}
                </span>
            </div>

            {!online ? (
                <div
                    class={`connection-banner${
                        selected_item ? "" : " connection-banner--hero"
                    }`}
                    role="status"
                >
                    {translate(locale, "network_offline")}
                </div>
            ) : source && source !== "network" ? (
                <div
                    class={`connection-banner${
                        selected_item ? "" : " connection-banner--hero"
                    }`}
                    role="status"
                >
                    {source_message(source, locale)}
                </div>
            ) : null}

            <main class={`app-main${selected_item ? " app-main--detail" : ""}`}>
                {selected_item ? (
                    <ContentDetail
                        item={selected_item}
                        locale={locale}
                        refresh_epoch={live_refresh_epoch}
                        on_message={show_message}
                        on_registered={() =>
                            set_live_refresh_epoch((current) => current + 1)
                        }
                        online={online}
                    />
                ) : (
                    <>
                        {active_view !== "manage" ? (
                            <PageHero
                                content={hero_content}
                                on_action={activate_hero}
                            />
                        ) : null}
                        {active_view === "manage" ? (
                            APP_CONFIG.stage === "preview" ? (
                                <section class="page-content">
                                    <p>{translate(locale, "preview_build")}</p>
                                </section>
                            ) : (
                                <AdminPage
                                    locale={locale}
                                    online={online}
                                    refresh_epoch={live_refresh_epoch}
                                />
                            )
                        ) : active_view === "about" ? (
                            <section class="page-content about-view">
                                <div class="section-heading">
                                    <span class="eyebrow">Across, together.</span>
                                    <h2>{section_title(active_view, locale)}</h2>
                                </div>
                                <div class="about-feature-grid">
                                    <button
                                        aria-label={translate(locale, "about")}
                                        class="about-feature-card"
                                        onClick={() => open_site_page("about")}
                                        type="button"
                                    >
                                        <img
                                            alt={translate(locale, "about")}
                                            src={`${APP_CONFIG.site_url}/images/about/paths.webp`}
                                        />
                                        <span class="about-feature-card__overlay" />
                                        <span class="about-feature-card__body">
                                            <small>
                                                {translate(locale, "about_eyebrow")}
                                            </small>
                                            <strong>
                                                {translate(locale, "about")}
                                            </strong>
                                            <span>
                                                {translate(locale, "about_intro")}
                                            </span>
                                            <b aria-hidden="true">↗</b>
                                        </span>
                                    </button>
                                    <button
                                        aria-label={translate(locale, "partners")}
                                        class="about-feature-card"
                                        onClick={() => open_site_page("partners")}
                                        type="button"
                                    >
                                        <img
                                            alt={translate(locale, "partners")}
                                            src={`${APP_CONFIG.site_url}/images/about/mountains.webp`}
                                        />
                                        <span class="about-feature-card__overlay" />
                                        <span class="about-feature-card__body">
                                            <small>Across, together.</small>
                                            <strong>
                                                {translate(locale, "partners")}
                                            </strong>
                                            <span>
                                                {translate(locale, "partners_intro")}
                                            </span>
                                            <b aria-hidden="true">↗</b>
                                        </span>
                                    </button>
                                </div>
                                <div class="about-links">
                                    <button
                                        onClick={() => open_site_page("membership")}
                                        type="button"
                                    >
                                        {translate(locale, "membership")} <span>↗</span>
                                    </button>
                                    <button
                                        onClick={() => open_site_page("insurance")}
                                        type="button"
                                    >
                                        {translate(locale, "insurance")} <span>↗</span>
                                    </button>
                                    <button
                                        onClick={() => open_site_page("privacy")}
                                        type="button"
                                    >
                                        {translate(locale, "privacy")} <span>↗</span>
                                    </button>
                                    <button
                                        onClick={() => open_site_page("")}
                                        type="button"
                                    >
                                        {translate(locale, "website")} <span>↗</span>
                                    </button>
                                </div>
                                {APP_CONFIG.stage !== "preview" ? (
                                    <SubscribeForm locale={locale} online={online} />
                                ) : null}
                                <AppUpdates locale={locale} />
                            </section>
                        ) : (
                            <section class="page-content">
                                {active_view !== "events" ||
                                event_groups.upcoming.length > 0 ? (
                                    <div class="section-heading">
                                        <span class="eyebrow">
                                            Across Cycling Club Munich
                                        </span>
                                        <h2>{section_title(active_view, locale)}</h2>
                                    </div>
                                ) : null}
                                <label class="search-field">
                                    <span aria-hidden="true">⌕</span>
                                    <span class="sr-only">
                                        {translate(locale, "search_placeholder")}
                                    </span>
                                    <input
                                        onInput={(event) =>
                                            set_query(event.currentTarget.value)
                                        }
                                        placeholder={translate(
                                            locale,
                                            "search_placeholder",
                                        )}
                                        type="search"
                                        value={query}
                                    />
                                </label>

                                {loading ? (
                                    <div class="empty-state" role="status">
                                        <span class="loader" />
                                        {translate(locale, "loading")}
                                    </div>
                                ) : error ? (
                                    <div class="empty-state" role="alert">
                                        <p>{error}</p>
                                        <button
                                            class="secondary-button"
                                            onClick={() => void load_feed(locale)}
                                            type="button"
                                        >
                                            {translate(locale, "retry")}
                                        </button>
                                    </div>
                                ) : visible_items.length === 0 ? (
                                    <div class="empty-state">
                                        {translate(locale, "no_content")}
                                    </div>
                                ) : (
                                    <>
                                        <div class="content-grid">
                                            {(active_view === "events"
                                                ? event_groups.upcoming
                                                : visible_items
                                            ).map((item) => (
                                                <ContentCard
                                                    favorite={favorites.has(item.id)}
                                                    item={item}
                                                    live_event={live_events[item.slug]}
                                                    key={`${item.locale}:${item.id}`}
                                                    locale={locale}
                                                    on_open={open_item}
                                                    on_toggle_favorite={toggle_favorite}
                                                />
                                            ))}
                                        </div>
                                        {active_view === "events" &&
                                        event_groups.past.length > 0 ? (
                                            <>
                                                <div class="section-heading">
                                                    <h2>
                                                        {translate(
                                                            locale,
                                                            "past_events",
                                                        )}
                                                    </h2>
                                                </div>
                                                <div class="content-grid">
                                                    {event_groups.past.map((item) => (
                                                        <ContentCard
                                                            favorite={favorites.has(
                                                                item.id,
                                                            )}
                                                            item={item}
                                                            live_event={
                                                                live_events[item.slug]
                                                            }
                                                            key={`${item.locale}:${item.id}`}
                                                            locale={locale}
                                                            on_open={open_item}
                                                            on_toggle_favorite={
                                                                toggle_favorite
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        ) : null}
                                    </>
                                )}
                            </section>
                        )}
                    </>
                )}
            </main>

            {!selected_item ? (
                <BottomNavigation
                    active_view={active_view}
                    locale={locale}
                    on_select={select_view}
                />
            ) : null}
            {message ? (
                <div aria-live="polite" class="toast" role="status">
                    {message}
                </div>
            ) : null}
        </div>
    );
}
