import type { CollectionEntry } from "astro:content";

type RecurringConfig = {
    enabled?: boolean;
    frequency?: "weekly";
    intervalWeeks?: number;
    timezone?: string;
    rolloverTime?: string;
    slugBase?: string;
    registrationDeadlineHoursBefore?: number;
    paused?: boolean;
};

type EventData = CollectionEntry<"events">["data"];
type EventEntry = CollectionEntry<"events">;
type EffectiveEventEntry = EventEntry & { sourceSlug?: string };

const DATE_SUFFIX_RE = /-\d{4}-\d{2}-\d{2}$/;

function get_time_zone_parts(date: Date, time_zone: string): Record<string, number> {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: time_zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    });

    return Object.fromEntries(
        formatter.formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number(part.value)]),
    );
}

function get_time_zone_offset_ms(date: Date, time_zone: string): number {
    const parts = get_time_zone_parts(date, time_zone);
    const local_as_utc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    );
    return local_as_utc - date.getTime();
}

function zoned_date_time_to_utc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    time_zone: string,
): Date {
    let utc_time = Date.UTC(year, month - 1, day, hour, minute, 0);
    for (let i = 0; i < 2; i += 1) {
        const offset = get_time_zone_offset_ms(new Date(utc_time), time_zone);
        utc_time = Date.UTC(year, month - 1, day, hour, minute, 0) - offset;
    }
    return new Date(utc_time);
}

function add_days_to_local_parts(
    parts: Record<string, number>,
    days: number,
): Record<string, number> {
    const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return {
        ...parts,
        year: next.getUTCFullYear(),
        month: next.getUTCMonth() + 1,
        day: next.getUTCDate(),
    };
}

function format_local_date(parts: Record<string, number>): string {
    const year = String(parts.year).padStart(4, "0");
    const month = String(parts.month).padStart(2, "0");
    const day = String(parts.day).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parse_time(value: string | undefined): { hour: number; minute: number } {
    const [hour = "22", minute = "00"] = (value ?? "22:00").split(":");
    return {
        hour: Number(hour),
        minute: Number(minute),
    };
}

function get_slug_base(data: EventData, recurring: RecurringConfig): string {
    if (recurring.slugBase) {
        return recurring.slugBase;
    }
    return data.slug.replace(DATE_SUFFIX_RE, "");
}

function get_deadline(
    data: EventData,
    recurring: RecurringConfig,
    event_date: Date,
    occurrence_delta_ms: number,
): string | null {
    if (typeof recurring.registrationDeadlineHoursBefore === "number") {
        return new Date(
            event_date.getTime() - recurring.registrationDeadlineHoursBefore * 60 * 60 * 1000,
        ).toISOString();
    }

    if (data.registrationDeadline) {
        return new Date(
            new Date(data.registrationDeadline).getTime() + occurrence_delta_ms,
        ).toISOString();
    }

    return null;
}

export function resolveRecurringEvent(
    entry: EventEntry,
    now: Date = new Date(),
): EffectiveEventEntry {
    const recurring = entry.data.recurring as RecurringConfig | undefined;
    if (
        !recurring ||
        recurring.enabled === false ||
        recurring.paused === true ||
        recurring.frequency !== "weekly"
    ) {
        return entry;
    }

    const time_zone = recurring.timezone ?? "Europe/Berlin";
    const interval_days = (recurring.intervalWeeks ?? 1) * 7;
    const rollover = parse_time(recurring.rolloverTime);
    let occurrence_parts = get_time_zone_parts(new Date(entry.data.date), time_zone);
    const original_event_date = new Date(entry.data.date);
    let event_date = zoned_date_time_to_utc(
        occurrence_parts.year,
        occurrence_parts.month,
        occurrence_parts.day,
        occurrence_parts.hour,
        occurrence_parts.minute,
        time_zone,
    );

    while (now >= zoned_date_time_to_utc(
        occurrence_parts.year,
        occurrence_parts.month,
        occurrence_parts.day,
        rollover.hour,
        rollover.minute,
        time_zone,
    )) {
        occurrence_parts = add_days_to_local_parts(occurrence_parts, interval_days);
        event_date = zoned_date_time_to_utc(
            occurrence_parts.year,
            occurrence_parts.month,
            occurrence_parts.day,
            occurrence_parts.hour,
            occurrence_parts.minute,
            time_zone,
        );
    }

    const occurrence_delta_ms = event_date.getTime() - original_event_date.getTime();
    const local_date = format_local_date(occurrence_parts);
    const slug = `${get_slug_base(entry.data, recurring)}-${local_date}`;

    return {
        ...entry,
        sourceSlug: entry.data.slug,
        data: {
            ...entry.data,
            slug,
            date: event_date.toISOString(),
            registrationDeadline: get_deadline(
                entry.data,
                recurring,
                event_date,
                occurrence_delta_ms,
            ),
        },
    };
}

export function resolveRecurringEvents(
    events: EventEntry[],
    now: Date = new Date(),
): EffectiveEventEntry[] {
    return events.map((event) => resolveRecurringEvent(event, now));
}

export function resolveEventEntryBySlug(
    all_events: EventEntry[],
    slug: string,
    lang: string,
    now: Date = new Date(),
): EffectiveEventEntry | undefined {
    const effective_events = resolveRecurringEvents(all_events, now);
    return (
        effective_events.find((e) => e.data.slug === slug && e.id.startsWith(`${lang}/`)) ??
        effective_events.find((e) => e.data.slug === slug && e.id.startsWith("zh/"))
    );
}
