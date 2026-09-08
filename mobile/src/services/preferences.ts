import { Preferences } from "@capacitor/preferences";

import type { MobileLocale } from "../../../shared/mobile_content";

const FAVORITES_KEY = "favorite_content_ids";
const LOCALE_KEY = "preferred_locale";

export async function load_favorites(): Promise<Set<string>> {
    const { value } = await Preferences.get({ key: FAVORITES_KEY });
    if (!value) {
        return new Set<string>();
    }

    try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed)
            ? new Set(parsed.filter((item): item is string => typeof item === "string"))
            : new Set<string>();
    } catch {
        return new Set<string>();
    }
}

export async function save_favorites(favorites: Set<string>): Promise<void> {
    await Preferences.set({
        key: FAVORITES_KEY,
        value: JSON.stringify([...favorites].sort()),
    });
}

export async function load_locale(): Promise<MobileLocale | undefined> {
    const { value } = await Preferences.get({ key: LOCALE_KEY });
    return value === "de" || value === "en" || value === "zh" ? value : undefined;
}

export async function save_locale(locale: MobileLocale): Promise<void> {
    await Preferences.set({ key: LOCALE_KEY, value: locale });
}
