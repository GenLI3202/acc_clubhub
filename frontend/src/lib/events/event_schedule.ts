import type { Locale } from "../i18n";

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
