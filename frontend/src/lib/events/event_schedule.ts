import type { Locale } from "../i18n";
import { parse_event_datetime } from "./event_datetime";

export function format_departure(value: string, lang: Locale = "en"): string {
    return new Date(value).toLocaleString(
        lang === "zh" ? "zh-CN" : lang === "de" ? "de-DE" : "en-GB",
        {
            timeZone: "Europe/Berlin",
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit", timeZoneName: "short",
        },
    );
}

export function departure_clock(value: string): string {
    return new Date(value).toLocaleTimeString("en-GB", {
        timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit",
    });
}

export function departure_day(value: string): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(value));
    const part = (type: string): string =>
        parts.find((item) => item.type === type)!.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
}

export function effective_registration_deadline(
    event_date: string,
    explicit_deadline: string | Date | null | undefined,
    reopened: boolean,
): string | null {
    if (reopened) {
        return null;
    }
    if (explicit_deadline) {
        return new Date(explicit_deadline).toISOString();
    }
    const previous_day = new Date(`${departure_day(event_date)}T00:00:00Z`);
    previous_day.setUTCDate(previous_day.getUTCDate() - 1);
    return parse_event_datetime(
        `${previous_day.toISOString().slice(0, 10)}T22:00:00`,
    ).toISOString();
}

export const SCHEDULE_NOTICE = {
    zh: {
        title: "出发时间已调整", previous: "原出发时间", current: "新出发时间",
        note: "以下时间均为慕尼黑当地时间，正文中原有的出发时间以此为准。报名及候补状态保持不变。",
    },
    en: {
        title: "Departure time updated", previous: "Previous departure",
        current: "New departure",
        note: "All times are local to Munich. This update replaces the departure time in the original description. Registration and waitlist status are unchanged.",
    },
    de: {
        title: "Startzeit geändert", previous: "Bisherige Startzeit",
        current: "Neue Startzeit",
        note: "Alle Zeiten sind Ortszeit München. Diese Änderung ersetzt die Startzeit in der ursprünglichen Beschreibung. Anmeldung und Wartelistenstatus bleiben unverändert.",
    },
};
