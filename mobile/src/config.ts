const DEFAULT_API_URL = "https://acc-clubhub-events-ms.vercel.app";
const DEFAULT_CONTENT_BASE_URL = "https://www.across-cc.de/mobile-content/v1";
const DEFAULT_SITE_URL = "https://www.across-cc.de";

function without_trailing_slash(value: string): string {
    return value.replace(/\/+$/, "");
}

export const APP_VERSION = "0.1.0";

export const APP_CONFIG = {
    api_url: without_trailing_slash(import.meta.env.VITE_API_URL ?? DEFAULT_API_URL),
    content_base_url: without_trailing_slash(
        import.meta.env.VITE_CONTENT_BASE_URL ?? DEFAULT_CONTENT_BASE_URL,
    ),
    site_url: without_trailing_slash(import.meta.env.VITE_SITE_URL ?? DEFAULT_SITE_URL),
} as const;
