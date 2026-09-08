import { App as CapacitorApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

import type {
    MobileContentFeed,
    MobileContentItem,
    MobileLocale,
} from "../../shared/mobile_content";
import { BottomNavigation, type AppView } from "./components/BottomNavigation";
import { ContentCard } from "./components/ContentCard";
import { ContentDetail } from "./components/ContentDetail";
import { SubscribeForm } from "./components/SubscribeForm";
import { APP_CONFIG } from "./config";
import { translate } from "./i18n";
import { sort_mobile_items } from "./lib/content";
import {
    ContentUpdateRequiredError,
    load_content_feed,
    type ContentSource,
} from "./services/content";
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

function filter_for_view(
    items: MobileContentItem[],
    view: AppView,
    favorites: Set<string>,
): MobileContentItem[] {
    if (view === "events") {
        return items.filter((item) => item.type === "event");
    }
    if (view === "routes") {
        return items.filter((item) => item.type === "route");
    }
    if (view === "learn") {
        return items.filter((item) =>
            ["gear", "media", "training"].includes(item.type),
        );
    }
    if (view === "favorites") {
        return items.filter((item) => favorites.has(item.id));
    }
    if (view === "home") {
        return items
            .filter(
                (item) =>
                    item.type !== "event" ||
                    new Date(item.metadata.event_date ?? 0).getTime() >= Date.now(),
            )
            .slice(0, 18);
    }
    return [];
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
    const [active_view, set_active_view] = useState<AppView>("home");
    const [selected_item, set_selected_item] = useState<MobileContentItem>();
    const [favorites, set_favorites] = useState<Set<string>>(new Set());
    const [query, set_query] = useState("");
    const [online, set_online] = useState(navigator.onLine);
    const [message, set_message] = useState<string>();
    const [pending_link, set_pending_link] = useState<ContentDeepLink>();
    const current_feed = useRef<MobileContentFeed>();
    const feed_request_id = useRef(0);

    const load_feed = useCallback(
        async (
            target_locale: MobileLocale,
            options: LoadFeedOptions = {},
        ): Promise<void> => {
            const request_id = feed_request_id.current + 1;
            feed_request_id.current = request_id;
            if (options.background) {
                set_refreshing(true);
            } else {
                set_loading(true);
                set_error(undefined);
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
                    set_refreshing(false);
                }
            }
        },
        [],
    );

    useEffect(() => {
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
                void load_feed(locale, {
                    announce: true,
                    background: true,
                });
            }
        }).then((listener) => {
            remove_listener = async (): Promise<void> => listener.remove();
        });
        return (): void => {
            void remove_listener?.();
        };
    }, [load_feed, locale]);

    useEffect(() => {
        let remove_listener: (() => Promise<void>) | undefined;
        void CapacitorApp.addListener("appStateChange", (state) => {
            if (state.isActive) {
                void load_feed(locale, { background: true });
            }
        }).then((listener) => {
            remove_listener = async (): Promise<void> => listener.remove();
        });
        return (): void => {
            void remove_listener?.();
        };
    }, [load_feed, locale]);

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
        let remove_listener: (() => Promise<void>) | undefined;
        void CapacitorApp.addListener("backButton", () => {
            if (selected_item) {
                set_selected_item(undefined);
            }
        }).then((listener) => {
            remove_listener = async (): Promise<void> => listener.remove();
        });
        return (): void => {
            void remove_listener?.();
        };
    }, [selected_item]);

    const visible_items = useMemo(() => {
        const all_items = sort_mobile_items(feed?.items ?? []);
        const scoped_items = filter_for_view(all_items, active_view, favorites);
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
    }, [active_view, favorites, feed, locale, query]);

    const select_view = (view: AppView): void => {
        set_active_view(view);
        set_selected_item(undefined);
        set_query("");
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

    return (
        <div class="app-shell">
            <header class="app-header">
                <button
                    aria-label={translate(locale, "home")}
                    class="brand-button"
                    onClick={() => select_view("home")}
                    type="button"
                >
                    <img alt="ACC ClubHub" src="/app-logo.png" />
                    <span>{translate(locale, "app_name")}</span>
                </button>
                <div class="app-header__actions">
                    <button
                        aria-label={translate(
                            locale,
                            refreshing ? "refreshing" : "refresh",
                        )}
                        class={`icon-button sync-button${
                            refreshing ? " is-refreshing" : ""
                        }`}
                        disabled={!online || loading || refreshing}
                        onClick={() =>
                            void load_feed(locale, {
                                announce: true,
                                background: Boolean(feed),
                            })
                        }
                        title={translate(locale, "refresh")}
                        type="button"
                    >
                        <span aria-hidden="true">↻</span>
                    </button>
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
                </div>
            </header>

            {!online ? (
                <div class="connection-banner" role="status">
                    {translate(locale, "network_offline")}
                </div>
            ) : source && source !== "network" ? (
                <div class="connection-banner" role="status">
                    {source_message(source, locale)}
                </div>
            ) : null}

            <main class="app-main">
                {selected_item ? (
                    <ContentDetail
                        favorite={favorites.has(selected_item.id)}
                        item={selected_item}
                        locale={locale}
                        on_back={() => set_selected_item(undefined)}
                        on_message={show_message}
                        on_toggle_favorite={toggle_favorite}
                        online={online}
                    />
                ) : active_view === "settings" ? (
                    <section class="settings-view">
                        <div class="page-heading">
                            <span class="eyebrow">Across Cycling Club Munich</span>
                            <h1>{translate(locale, "settings")}</h1>
                        </div>
                        <div class="settings-links">
                            <button
                                onClick={() => open_site_page("about")}
                                type="button"
                            >
                                {translate(locale, "about")} <span>↗</span>
                            </button>
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
                            <button onClick={() => open_site_page("")} type="button">
                                {translate(locale, "website")} <span>↗</span>
                            </button>
                        </div>
                        <SubscribeForm locale={locale} online={online} />
                    </section>
                ) : (
                    <section>
                        <div class="page-heading">
                            <span class="eyebrow">Across Cycling Club Munich</span>
                            <h1>{translate(locale, active_view)}</h1>
                        </div>
                        <div class="category-tabs" role="tablist">
                            {(["home", "events", "routes", "learn"] as AppView[]).map(
                                (view) => (
                                    <button
                                        aria-selected={active_view === view}
                                        class={active_view === view ? "is-active" : ""}
                                        key={view}
                                        onClick={() => select_view(view)}
                                        role="tab"
                                        type="button"
                                    >
                                        {view === "home"
                                            ? translate(locale, "all")
                                            : translate(locale, view)}
                                    </button>
                                ),
                            )}
                        </div>
                        <label class="search-field">
                            <span aria-hidden="true">⌕</span>
                            <span class="sr-only">
                                {translate(locale, "search_placeholder")}
                            </span>
                            <input
                                onInput={(event) =>
                                    set_query(event.currentTarget.value)
                                }
                                placeholder={translate(locale, "search_placeholder")}
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
                            <div class="content-grid">
                                {visible_items.map((item) => (
                                    <ContentCard
                                        favorite={favorites.has(item.id)}
                                        item={item}
                                        key={`${item.locale}:${item.id}`}
                                        locale={locale}
                                        on_open={set_selected_item}
                                        on_toggle_favorite={toggle_favorite}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
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
