import { App as CapacitorApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

import type {
    MobileContentFeed,
    MobileContentItem,
    MobileLocale,
} from "../../shared/mobile_content";
import { BottomNavigation } from "./components/BottomNavigation";
import { ContentCard } from "./components/ContentCard";
import { ContentDetail } from "./components/ContentDetail";
import { PageHero } from "./components/PageHero";
import { SubscribeForm } from "./components/SubscribeForm";
import { APP_CONFIG } from "./config";
import { use_pull_to_refresh } from "./hooks/use_pull_to_refresh";
import { translate } from "./i18n";
import { filter_items_for_view, sort_mobile_items, type AppView } from "./lib/content";
import { create_page_hero, section_title } from "./lib/page_hero";
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

    const pull_refresh = use_pull_to_refresh({
        disabled: !online || loading,
        on_refresh: async (): Promise<void> => {
            await load_feed(locale, {
                announce: true,
                background: Boolean(feed),
            });
        },
        refreshing,
    });

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
                set_selected_item(undefined);
            }
        }).then((listener) => {
            remove_listener = async (): Promise<void> => listener.remove();
        });
        return (): void => {
            void remove_listener?.();
        };
    }, [selected_item]);

    const all_items = useMemo(() => sort_mobile_items(feed?.items ?? []), [feed]);
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
    const hero_content = useMemo(
        () => create_page_hero(active_view, scoped_items, locale, APP_CONFIG.site_url),
        [active_view, locale, scoped_items],
    );

    const select_view = (view: AppView): void => {
        set_active_view(view);
        set_selected_item(undefined);
        set_query("");
        window.scrollTo(0, 0);
    };

    const open_item = (item: MobileContentItem): void => {
        set_selected_item(item);
        window.scrollTo(0, 0);
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
            <header class={`app-header${selected_item ? "" : " app-header--hero"}`}>
                <button
                    aria-label={translate(locale, "events")}
                    class="brand-button"
                    onClick={() => select_view("events")}
                    type="button"
                >
                    <img alt="ACC ClubHub" src="/app-logo.png" />
                    <span>{translate(locale, "app_name")}</span>
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
            </header>

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
                        favorite={favorites.has(selected_item.id)}
                        item={selected_item}
                        locale={locale}
                        on_back={() => set_selected_item(undefined)}
                        on_message={show_message}
                        on_toggle_favorite={toggle_favorite}
                        online={online}
                    />
                ) : (
                    <>
                        <PageHero content={hero_content} on_action={activate_hero} />
                        {active_view === "about" ? (
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
                                <SubscribeForm locale={locale} online={online} />
                            </section>
                        ) : (
                            <section class="page-content">
                                <div class="section-heading">
                                    <span class="eyebrow">
                                        Across Cycling Club Munich
                                    </span>
                                    <h2>{section_title(active_view, locale)}</h2>
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
                                    <div class="content-grid">
                                        {visible_items.map((item) => (
                                            <ContentCard
                                                favorite={favorites.has(item.id)}
                                                item={item}
                                                key={`${item.locale}:${item.id}`}
                                                locale={locale}
                                                on_open={open_item}
                                                on_toggle_favorite={toggle_favorite}
                                            />
                                        ))}
                                    </div>
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
