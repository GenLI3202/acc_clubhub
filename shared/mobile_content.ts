export const MOBILE_CONTENT_SCHEMA_VERSION = 1 as const;

export const MOBILE_LOCALES = ["de", "en", "zh"] as const;

export const MOBILE_CONTENT_TYPES = [
    "event",
    "route",
    "media",
    "gear",
    "training",
] as const;

export type MobileLocale = (typeof MOBILE_LOCALES)[number];
export type MobileContentType = (typeof MOBILE_CONTENT_TYPES)[number];

export interface MobileContentLink {
    kind: "website" | "komoot" | "strava" | "video" | "xiaohongshu";
    url: string;
}

export interface MobileEventRecurrence {
    enabled: boolean;
    frequency: "weekly";
    interval_weeks: number;
    paused: boolean;
    rollover_time: string;
    timezone: string;
}

export interface MobileContentMetadata {
    author?: string;
    category?: string;
    difficulty?: string;
    distance_km?: number;
    elevation_m?: number;
    event_date?: string;
    event_type?: string;
    location?: string;
    max_participants?: number;
    media_type?: string;
    recurring?: MobileEventRecurrence;
    registration_deadline?: string | null;
    registration_link?: string;
    registration_reopened?: boolean;
    region?: string;
    surface?: string;
    tags?: string[];
    wechat_qr_code?: string;
}

export interface MobileContentItem {
    body_html: string;
    cover_image?: string;
    description: string;
    featured: boolean;
    id: string;
    links: MobileContentLink[];
    locale: MobileLocale;
    metadata: MobileContentMetadata;
    published_at?: string;
    slug: string;
    title: string;
    type: MobileContentType;
}

export interface MobileContentFeed {
    content_revision: string;
    generated_at: string;
    items: MobileContentItem[];
    locale: MobileLocale;
    minimum_app_version: string;
    schema_version: typeof MOBILE_CONTENT_SCHEMA_VERSION;
}

function is_record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function is_mobile_locale(value: unknown): value is MobileLocale {
    return (
        typeof value === "string" &&
        MOBILE_LOCALES.includes(value as MobileLocale)
    );
}

export function is_mobile_content_feed(
    value: unknown,
): value is MobileContentFeed {
    if (!is_record(value)) {
        return false;
    }

    return (
        value.schema_version === MOBILE_CONTENT_SCHEMA_VERSION &&
        typeof value.content_revision === "string" &&
        value.content_revision.length > 0 &&
        typeof value.generated_at === "string" &&
        typeof value.minimum_app_version === "string" &&
        is_mobile_locale(value.locale) &&
        Array.isArray(value.items) &&
        value.items.every(is_mobile_content_item)
    );
}

function is_mobile_content_item(value: unknown): value is MobileContentItem {
    if (!is_record(value) || !is_mobile_locale(value.locale)) {
        return false;
    }

    return (
        typeof value.id === "string" &&
        typeof value.slug === "string" &&
        typeof value.title === "string" &&
        typeof value.description === "string" &&
        typeof value.body_html === "string" &&
        typeof value.featured === "boolean" &&
        MOBILE_CONTENT_TYPES.includes(value.type as MobileContentType) &&
        Array.isArray(value.links) &&
        is_record(value.metadata)
    );
}
