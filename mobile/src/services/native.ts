import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Share } from "@capacitor/share";
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";

import type {
    MobileContentItem,
    MobileContentType,
    MobileLocale,
} from "../../../shared/mobile_content";
import { APP_CONFIG } from "../config";

export interface ContentDeepLink {
    locale: MobileLocale;
    slug: string;
    type: MobileContentType;
}

const WEBSITE_PATH_TYPES: Record<string, MobileContentType> = {
    events: "event",
    media: "media",
    routes: "route",
    training: "training",
    gear: "gear",
};

export function parse_content_deep_link(value: string): ContentDeepLink | undefined {
    try {
        const url = new URL(value);
        if (url.protocol === "accclubhub:") {
            const parts = [url.hostname, ...url.pathname.split("/")].filter(Boolean);
            if (parts[0] !== "content" || parts.length < 3) {
                return undefined;
            }
            const type = parts[1] as MobileContentType;
            const locale = (url.searchParams.get("lang") ?? "zh") as MobileLocale;
            if (
                !["event", "route", "media", "gear", "training"].includes(type) ||
                !["de", "en", "zh"].includes(locale)
            ) {
                return undefined;
            }
            return { locale, slug: parts[2] ?? "", type };
        }

        const is_official_host =
            url.hostname === "across-cc.de" || url.hostname.endsWith(".across-cc.de");
        if (url.protocol !== "https:" || !is_official_host) {
            return undefined;
        }
        const parts = url.pathname.split("/").filter(Boolean);
        const locale = parts[0] as MobileLocale;
        if (!["de", "en", "zh"].includes(locale)) {
            return undefined;
        }
        let type_segment = parts[1];
        let slug = parts[2];
        if (type_segment === "knowledge") {
            type_segment = parts[2];
            slug = parts[3];
        }
        const type = WEBSITE_PATH_TYPES[type_segment ?? ""];
        return type && slug ? { locale, slug, type } : undefined;
    } catch {
        return undefined;
    }
}

export async function listen_for_deep_links(
    on_link: (link: ContentDeepLink) => void,
): Promise<() => Promise<void>> {
    const listener = await App.addListener("appUrlOpen", ({ url }) => {
        const link = parse_content_deep_link(url);
        if (link) {
            on_link(link);
        }
    });
    return async (): Promise<void> => listener.remove();
}

export async function open_external_url(value: string): Promise<void> {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Unsupported external URL");
    }
    await Browser.open({ presentationStyle: "popover", url: url.toString() });
}

export async function share_content(item: MobileContentItem): Promise<void> {
    const website_url =
        item.links.find((link) => link.kind === "website")?.url ??
        `${APP_CONFIG.site_url}/${item.locale}`;
    await Share.share({
        dialogTitle: item.title,
        text: item.description,
        title: item.title,
        url: website_url,
    });
}

export async function add_event_to_calendar(item: MobileContentItem): Promise<void> {
    if (!item.metadata.event_date) {
        throw new Error("Event date is missing");
    }
    const start_date = new Date(item.metadata.event_date).getTime();
    const end_date = start_date + 3 * 60 * 60 * 1_000;
    const website_url = item.links.find((link) => link.kind === "website")?.url;

    await CapacitorCalendar.createEventWithPrompt({
        description: [item.description, website_url].filter(Boolean).join("\n\n"),
        endDate: end_date,
        location: item.metadata.location,
        startDate: start_date,
        title: item.title,
    });
}
