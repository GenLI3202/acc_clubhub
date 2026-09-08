import type { MobileContentItem, MobileLocale } from "../../../shared/mobile_content";
import { translate } from "../i18n";
import {
    format_item_date,
    format_item_type,
    registration_time_is_open,
    type AppView,
} from "./content";

export interface PageHeroContent {
    action_label?: string;
    action_target?: "content" | "membership";
    description: string;
    eyebrow: string;
    image_url: string;
    item?: MobileContentItem;
    meta?: string;
    title: string;
    view: AppView;
}

const STATIC_IMAGE_PATHS: Record<AppView, string> = {
    about: "/images/about/hero.webp",
    events: "/images/media/adventure/rad-race-120-2025/gallery/2026-group-turn.jpg",
    gear: "/images/shared/stock/bike-fitting.jpg",
    media: "/images/media/video/alps-summer-2025/cover.jpg",
    training: "/images/media/adventure/rad-race-120-2025/gallery/2025-sonntag.jpg",
};

function site_asset(site_url: string, path: string): string {
    return `${site_url}${path}`;
}

function select_hero_item(
    items: MobileContentItem[],
    preferred_type?: MobileContentItem["type"],
): MobileContentItem | undefined {
    const candidates = preferred_type
        ? items.filter((item) => item.type === preferred_type)
        : items;
    return (
        candidates.find((item) => item.featured && item.cover_image) ??
        candidates.find((item) => item.cover_image) ??
        candidates[0]
    );
}

function create_event_hero(
    items: MobileContentItem[],
    locale: MobileLocale,
    site_url: string,
): PageHeroContent {
    const item = select_hero_item(items, "event");
    if (!item) {
        return {
            description: translate(locale, "events_intro"),
            eyebrow: "ACROSS · EVENTS",
            image_url: site_asset(site_url, STATIC_IMAGE_PATHS.events),
            title: translate(locale, "events"),
            view: "events",
        };
    }
    const date = format_item_date(item, locale);
    const location = item.metadata.location;
    return {
        action_label: translate(
            locale,
            registration_time_is_open(item) ? "register" : "details",
        ),
        action_target: "content",
        description: item.description,
        eyebrow: format_item_type(item, locale),
        image_url: item.cover_image ?? site_asset(site_url, STATIC_IMAGE_PATHS.events),
        item,
        meta: [date, location].filter(Boolean).join(" · "),
        title: item.title,
        view: "events",
    };
}

export function create_page_hero(
    view: AppView,
    items: MobileContentItem[],
    locale: MobileLocale,
    site_url: string,
): PageHeroContent {
    if (view === "events") {
        return create_event_hero(items, locale, site_url);
    }
    if (view === "about") {
        return {
            action_label: translate(locale, "join_us"),
            action_target: "membership",
            description: translate(locale, "about_intro"),
            eyebrow: translate(locale, "about_eyebrow"),
            image_url: site_asset(site_url, STATIC_IMAGE_PATHS.about),
            meta: "München · founded 2023",
            title: "Across Cycling Club",
            view,
        };
    }

    const item = select_hero_item(items, view === "media" ? "media" : view);
    const copy = {
        gear: {
            description: translate(locale, "gear_intro"),
            eyebrow: "ACROSS · GEAR",
        },
        media: {
            description: translate(locale, "media_intro"),
            eyebrow: "ACROSS · MEDIA",
        },
        training: {
            description: translate(locale, "training_intro"),
            eyebrow: "ACROSS · TRAINING",
        },
    }[view];
    return {
        description: copy.description,
        eyebrow: copy.eyebrow,
        image_url: item?.cover_image ?? site_asset(site_url, STATIC_IMAGE_PATHS[view]),
        title: translate(locale, view),
        view,
    };
}

export function section_title(view: AppView, locale: MobileLocale): string {
    if (view === "events") {
        return translate(locale, "upcoming_events");
    }
    if (view === "media") {
        return translate(locale, "media_and_routes");
    }
    if (view === "about") {
        return translate(locale, "about_and_partners");
    }
    return translate(locale, "all_articles");
}
