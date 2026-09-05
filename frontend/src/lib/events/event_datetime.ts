const MUNICH_PARTS = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
});
const DAY_MS = 24 * 60 * 60 * 1000;

function local_clock_as_utc(value: number): number {
    const parts = Object.fromEntries(
        MUNICH_PARTS.formatToParts(new Date(value))
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number(part.value)]),
    );
    return Date.UTC(
        parts.year, parts.month - 1, parts.day,
        parts.hour, parts.minute, parts.second,
    );
}

/** Interpret timezone-free event clock strings as Munich time, never server time. */
export function parse_event_datetime(value: unknown): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value !== "string") throw new Error("Invalid event timestamp");
    const raw = value.trim();
    const local = raw.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
    );
    if (!local) {
        const has_offset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
        const date_only = /^\d{4}-\d{2}-\d{2}$/.test(raw);
        const instant = new Date(raw);
        if ((has_offset || date_only) && !Number.isNaN(instant.getTime())) {
            return instant;
        }
        throw new Error("Use an ISO event timestamp with an explicit timezone");
    }

    const [, year, month, day, hour, minute, second = "00"] = local;
    const nominal = Date.UTC(
        Number(year), Number(month) - 1, Number(day),
        Number(hour), Number(minute), Number(second),
    );
    const expected = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
    if (new Date(nominal).toISOString() !== expected) {
        throw new Error("Invalid event calendar date or clock time");
    }
    // Consider both sides of a DST transition, requiring exactly one real instant.
    const offsets = new Set([-DAY_MS, 0, DAY_MS].map((delta) => {
        const probe = nominal + delta;
        return local_clock_as_utc(probe) - probe;
    }));
    const candidates = [...offsets]
        .map((offset) => nominal - offset)
        .filter((candidate) => local_clock_as_utc(candidate) === nominal);
    if (candidates.length !== 1) {
        throw new Error("Ambiguous or nonexistent Munich time; specify UTC offset");
    }
    return new Date(candidates[0]);
}
