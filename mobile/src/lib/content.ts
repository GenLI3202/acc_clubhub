import type {
    MobileContentItem,
    MobileContentType,
    MobileLocale,
} from "../../../shared/mobile_content";

const TYPE_ORDER: Record<MobileContentType, number> = {
    event: 0,
    route: 1,
    training: 2,
    gear: 3,
    media: 4,
};

export function format_item_date(
    item: MobileContentItem,
    locale: MobileLocale,
): string | undefined {
    const value = item.metadata.event_date ?? item.published_at;
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

export function sort_mobile_items(items: MobileContentItem[]): MobileContentItem[] {
    return [...items].sort((left, right) => {
        if (left.type === "event" && right.type === "event") {
            const now = Date.now();
            const left_time = new Date(left.metadata.event_date ?? 0).getTime();
            const right_time = new Date(right.metadata.event_date ?? 0).getTime();
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
