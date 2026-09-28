import { getCollection } from "astro:content";

import {
    MOBILE_LOCALES,
    type MobileContentItem,
    type MobileContentLink,
    type MobileLocale,
} from "../../../../shared/mobile_content";
import { resolveRecurringEvents } from "../events/recurringEvents";
import { effective_registration_deadline } from "../events/event_schedule";
import {
    normalize_public_url,
    sanitize_mobile_markdown,
} from "./feed";

const CONTENT_TYPE_PATHS = {
    event: "events",
    gear: "knowledge/gear",
    media: "media",
    route: "routes",
    training: "knowledge/training",
} as const;

function matches_locale(
    id: string,
    data_locale: string | undefined,
    locale: MobileLocale,
): boolean {
    const path_locale = id.split("/", 1)[0];
    if (MOBILE_LOCALES.includes(path_locale as MobileLocale)) {
        return path_locale === locale;
    }
    return data_locale === locale;
}

function create_link(
    kind: MobileContentLink["kind"],
    value: string | undefined,
    site_url: string,
): MobileContentLink | undefined {
    const url = normalize_public_url(value, site_url);
    return url ? { kind, url } : undefined;
}

function compact_links(
    links: Array<MobileContentLink | undefined>,
): MobileContentLink[] {
    return links.filter((link): link is MobileContentLink => link !== undefined);
}

function content_website_url(
    type: keyof typeof CONTENT_TYPE_PATHS,
    locale: MobileLocale,
    slug: string,
    site_url: string,
): string {
    const path = CONTENT_TYPE_PATHS[type];
    return new URL(`/${locale}/${path}/${slug}`, site_url).toString();
}

export async function build_mobile_items(
    locale: MobileLocale,
    site_url: string,
): Promise<MobileContentItem[]> {
    const [media, gear, training, routes, events] = await Promise.all([
        getCollection(
            "media",
            ({ id, data }) =>
                matches_locale(id, data.lang, locale) &&
                data.status === "published",
        ),
        getCollection(
            "gear",
            ({ id, data }) =>
                matches_locale(id, data.lang, locale) &&
                data.status === "published",
        ),
        getCollection(
            "training",
            ({ id, data }) =>
                matches_locale(id, data.lang, locale) &&
                data.status === "published",
        ),
        getCollection(
            "routes",
            ({ id, data }) =>
                matches_locale(id, data.lang, locale) &&
                data.status === "published",
        ),
        getCollection(
            "events",
            ({ id, data }) =>
                matches_locale(id, data.lang, locale) &&
                data.status === "published" &&
                data.directOnly !== true,
        ),
    ]);
    const fallback_events = locale === "zh" ? [] : await getCollection(
        "events",
        ({ id, data }) =>
            matches_locale(id, data.lang, "zh") &&
            data.status === "published" &&
            data.directOnly !== true,
    );
    const local_event_slugs = new Set(events.map((entry) => entry.data.slug));
    const event_entries = [
        ...events,
        ...fallback_events.filter(
            (entry) => !local_event_slugs.has(entry.data.slug),
        ),
    ];

    const media_items: MobileContentItem[] = media.map((entry) => ({
        body_html: sanitize_mobile_markdown(entry.body, site_url),
        cover_image: normalize_public_url(entry.data.coverImage, site_url),
        description: entry.data.description ?? "",
        featured: entry.data.featured,
        id: `media:${entry.data.slug}`,
        links: compact_links([
            create_link(
                "website",
                content_website_url(
                    "media",
                    locale,
                    entry.data.slug,
                    site_url,
                ),
                site_url,
            ),
            create_link("video", entry.data.videoUrl, site_url),
            create_link("xiaohongshu", entry.data.xiaohongshuUrl, site_url),
        ]),
        locale,
        metadata: {
            author: entry.data.author,
            media_type: entry.data.type,
            tags: entry.data.tags,
        },
        published_at: entry.data.date,
        slug: entry.data.slug,
        title: entry.data.title,
        type: "media",
    }));

    const gear_items: MobileContentItem[] = gear.map((entry) => ({
        body_html: sanitize_mobile_markdown(entry.body, site_url),
        cover_image: normalize_public_url(entry.data.coverImage, site_url),
        description: entry.data.description ?? "",
        featured: entry.data.featured,
        id: `gear:${entry.data.slug}`,
        links: compact_links([
            create_link(
                "website",
                content_website_url(
                    "gear",
                    locale,
                    entry.data.slug,
                    site_url,
                ),
                site_url,
            ),
            create_link("xiaohongshu", entry.data.xiaohongshuUrl, site_url),
        ]),
        locale,
        metadata: {
            author: entry.data.author,
            category: entry.data.category,
        },
        published_at: entry.data.date,
        slug: entry.data.slug,
        title: entry.data.title,
        type: "gear",
    }));

    const training_items: MobileContentItem[] = training.map((entry) => ({
        body_html: sanitize_mobile_markdown(entry.body, site_url),
        cover_image: normalize_public_url(entry.data.coverImage, site_url),
        description: entry.data.description ?? "",
        featured: entry.data.featured,
        id: `training:${entry.data.slug}`,
        links: compact_links([
            create_link(
                "website",
                content_website_url(
                    "training",
                    locale,
                    entry.data.slug,
                    site_url,
                ),
                site_url,
            ),
            create_link("xiaohongshu", entry.data.xiaohongshuUrl, site_url),
        ]),
        locale,
        metadata: {
            author: entry.data.author,
            category: entry.data.category,
            tags: entry.data.tags,
        },
        published_at: entry.data.date,
        slug: entry.data.slug,
        title: entry.data.title,
        type: "training",
    }));

    const route_items: MobileContentItem[] = routes.map((entry) => ({
        body_html: sanitize_mobile_markdown(entry.body, site_url),
        cover_image: normalize_public_url(entry.data.coverImage, site_url),
        description: entry.data.description,
        featured: entry.data.featured,
        id: `route:${entry.data.slug}`,
        links: compact_links([
            create_link(
                "website",
                content_website_url(
                    "route",
                    locale,
                    entry.data.slug,
                    site_url,
                ),
                site_url,
            ),
            create_link("komoot", entry.data.komootUrl, site_url),
            create_link("strava", entry.data.stravaUrl, site_url),
            create_link("xiaohongshu", entry.data.xiaohongshuUrl, site_url),
        ]),
        locale,
        metadata: {
            author: entry.data.author,
            difficulty: entry.data.difficulty,
            distance_km: entry.data.distance,
            elevation_m: entry.data.elevation,
            region: entry.data.region,
            surface: entry.data.surface,
        },
        slug: entry.data.slug,
        title: entry.data.name,
        type: "route",
    }));

    const event_items: MobileContentItem[] = resolveRecurringEvents(event_entries).map(
        (entry) => ({
            body_html: sanitize_mobile_markdown(entry.body, site_url),
            cover_image: normalize_public_url(entry.data.coverImage, site_url),
            description: entry.data.description,
            featured: entry.data.displaySections.includes("hero"),
            id: `event:${entry.sourceSlug ?? entry.data.slug}`,
            links: compact_links([
                create_link(
                    "website",
                    content_website_url(
                        "event",
                        entry.id.startsWith("zh/") ? "zh" : locale,
                        entry.data.slug,
                        site_url,
                    ),
                    site_url,
                ),
                create_link("komoot", entry.data.routeKomootUrl, site_url),
                create_link("strava", entry.data.routeStravaUrl, site_url),
                create_link(
                    "xiaohongshu",
                    entry.data.xiaohongshuUrl,
                    site_url,
                ),
            ]),
            locale,
            metadata: {
                acc_official_ride: entry.data.ACCOfficialRide === true,
                author: entry.data.author,
                distance_km: entry.data.distanceKm,
                event_date: entry.data.date,
                event_type: entry.data.eventType,
                location: entry.data.location,
                max_participants: entry.data.maxParticipants,
                recurring: entry.data.recurring
                    ? {
                          enabled: entry.data.recurring.enabled,
                          frequency: entry.data.recurring.frequency,
                          interval_weeks: entry.data.recurring.intervalWeeks,
                          paused: entry.data.recurring.paused,
                          rollover_time: entry.data.recurring.rolloverTime,
                          timezone: entry.data.recurring.timezone,
                      }
                    : undefined,
                registration_deadline: effective_registration_deadline(
                    entry.data.date,
                    entry.data.registrationDeadline,
                    entry.data.registrationReopened === true,
                ),
                registration_link: normalize_public_url(
                    entry.data.registrationLink,
                    site_url,
                ),
                registration_reopened: entry.data.registrationReopened,
                wechat_qr_code: normalize_public_url(
                    entry.data.wechatQrCode,
                    site_url,
                ),
            },
            published_at: entry.data.date,
            slug: entry.data.slug,
            title: entry.data.title,
            type: "event",
        }),
    );

    return [
        ...event_items,
        ...route_items,
        ...media_items,
        ...gear_items,
        ...training_items,
    ];
}
