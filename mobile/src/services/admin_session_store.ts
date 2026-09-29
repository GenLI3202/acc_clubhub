import { Preferences } from "@capacitor/preferences";

const ADMIN_REFRESH_TOKEN_KEY = "admin_refresh_token_v1";

export async function load_admin_refresh_token(): Promise<string | undefined> {
    const { value } = await Preferences.get({ key: ADMIN_REFRESH_TOKEN_KEY });
    return value || undefined;
}

export async function save_admin_refresh_token(token: string): Promise<void> {
    await Preferences.set({ key: ADMIN_REFRESH_TOKEN_KEY, value: token });
}

export async function clear_admin_refresh_token(): Promise<void> {
    await Preferences.remove({ key: ADMIN_REFRESH_TOKEN_KEY });
}
