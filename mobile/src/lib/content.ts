import type {
    MobileContentItem,
    MobileContentType,
    MobileLocale,
} from "../../../shared/mobile_content";
import type { EventLiveState, EventStatusResult } from "../services/api";

export type AppView = "about" | "events" | "gear" | "manage" | "media" | "training";

const TYPE_ORDER: Record<MobileContentType, number> = {
    event: 0,
    route: 1,
    training: 2,
    gear: 3,
    media: 4,
};

const TYPE_LABELS: Record<MobileLocale, Record<MobileContentItem["type"], string>> = {
    de: {
        event: "Tour",
        gear: "Ausrüstung",
        media: "Story",
        route: "Route",
        training: "Training",
    },
    en: {
        event: "Ride",
        gear: "Gear",
        media: "Story",
        route: "Route",
        training: "Training",
    },
    zh: {
        event: "活动",
        gear: "器械",
        media: "骑行故事",
        route: "路线",
        training: "训练",
    },
};

const EVENT_TYPE_LABELS: Record<MobileLocale, Record<string, string>> = {
    de: {
        "social-ride": "Social Ride",
        "training-camp": "Trainingslager",
        race: "Rennen",
        workshop: "Workshop",
    },
    en: {
        "social-ride": "Social Ride",
        "training-camp": "Training Camp",
        race: "Race",
        workshop: "Workshop",
    },
    zh: {
        "social-ride": "休闲骑",
        "training-camp": "训练营",
        race: "比赛",
        workshop: "工作坊",
    },
};

const EPIC_RIDE_SLUGS = new Set([
    "hahntennjoch-epic-ride",
    "acc-epic-ride-munich-linden-loop-2026-09-05",
    "acc-epic-ride-rosenheim-kufstein-loop-2026-09-12",
]);

const BERLIN_DAY_FORMAT = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
    year: "numeric",
});

function berlin_calendar_day(date: Date): string {
    const parts = Object.fromEntries(
        BERLIN_DAY_FORMAT.formatToParts(date).map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function filter_items_for_view(
    items: MobileContentItem[],
    view: AppView,
): MobileContentItem[] {
    if (view === "events") {
        return items.filter((item) => item.type === "event");
    }
    if (view === "media") {
        return items.filter((item) => item.type === "media" || item.type === "route");
    }
    if (view === "gear") {
        return items.filter((item) => item.type === "gear");
    }
    if (view === "training") {
        return items.filter((item) => item.type === "training");
    }
    return [];
}

export function format_item_date(
    item: MobileContentItem,
    locale: MobileLocale,
    live_event_date?: string,
): string | undefined {
    const value = live_event_date ?? item.metadata.event_date ?? item.published_at;
    if (!value) {
        return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: item.type === "event" ? "short" : undefined,
        timeZone: "Europe/Berlin",
    }).format(date);
}

export function registration_live_is_open(
    item: MobileContentItem,
    status: EventStatusResult,
    now: Date = new Date(),
): boolean {
    if (item.type !== "event" || status.kind !== "live") {
        return false;
    }
    const event = status.value;
    if (
        event.slug !== item.slug ||
        event.is_cancelled ||
        !event.is_public ||
        !Number.isFinite(new Date(event.event_date).getTime()) ||
        new Date(event.event_date).getTime() <= now.getTime()
    ) {
        return false;
    }
    return (
        !event.registration_deadline ||
        (Number.isFinite(new Date(event.registration_deadline).getTime()) &&
            new Date(event.registration_deadline).getTime() > now.getTime())
    );
}

export function format_item_type(
    item: MobileContentItem,
    locale: MobileLocale,
): string {
    if (item.type === "event") {
        if (EPIC_RIDE_SLUGS.has(item.slug)) {
            return "Epic Ride";
        }
        const event_type = item.metadata.event_type;
        if (event_type) {
            return EVENT_TYPE_LABELS[locale][event_type] ?? event_type;
        }
    }
    return TYPE_LABELS[locale][item.type];
}

export function split_event_items(
    items: MobileContentItem[],
    live_events: Record<string, EventLiveState> = {},
    now: Date = new Date(),
): { upcoming: MobileContentItem[]; past: MobileContentItem[] } {
    const today = berlin_calendar_day(now);
    const upcoming: MobileContentItem[] = [];
    const past: MobileContentItem[] = [];
    for (const item of items) {
        const raw_date = live_events[item.slug]?.event_date ?? item.metadata.event_date;
        const date = raw_date ? new Date(raw_date) : undefined;
        const day =
            date && !Number.isNaN(date.getTime())
                ? berlin_calendar_day(date)
                : undefined;
        (day && day >= today ? upcoming : past).push(item);
    }
    return { upcoming, past };
}

export function sort_mobile_items(
    items: MobileContentItem[],
    live_events: Record<string, EventLiveState> = {},
): MobileContentItem[] {
    return [...items].sort((left, right) => {
        if (left.type === "event" && right.type === "event") {
            const now = Date.now();
            const left_time = new Date(
                live_events[left.slug]?.event_date ?? left.metadata.event_date ?? 0,
            ).getTime();
            const right_time = new Date(
                live_events[right.slug]?.event_date ?? right.metadata.event_date ?? 0,
            ).getTime();
            const left_upcoming = left_time >= now;
            const right_upcoming = right_time >= now;
            if (left_upcoming !== right_upcoming) {
                return left_upcoming ? -1 : 1;
            }
            return left_upcoming ? left_time - right_time : right_time - left_time;
        }
        if (left.type !== right.type) {
            return TYPE_ORDER[left.type] - TYPE_ORDER[right.type];
        }
        return (
            new Date(right.published_at ?? 0).getTime() -
            new Date(left.published_at ?? 0).getTime()
        );
    });
}

export function registration_time_is_open(
    item: MobileContentItem,
    now: Date = new Date(),
): boolean {
    if (item.type !== "event" || !item.metadata.event_date) {
        return false;
    }
    if (new Date(item.metadata.event_date).getTime() <= now.getTime()) {
        return false;
    }
    if (
        item.metadata.registration_deadline &&
        item.metadata.registration_reopened !== true &&
        new Date(item.metadata.registration_deadline).getTime() <= now.getTime()
    ) {
        return false;
    }
    return true;
}
