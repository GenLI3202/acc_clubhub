import live_update_config from "../live_update.config.json";
import { release_asset_base_url, release_manifest_url } from "./lib/live_update";

const DEFAULT_API_URL = "https://acc-clubhub-events-ms.vercel.app";
const DEFAULT_CONTENT_BASE_URL = "https://www.across-cc.de/mobile-content/v1";
const DEFAULT_SITE_URL = "https://www.across-cc.de";

function without_trailing_slash(value: string): string {
    return value.replace(/\/+$/, "");
}

export const APP_VERSION = "0.2.0";

export const APP_CONFIG = {
    api_url: without_trailing_slash(import.meta.env.VITE_API_URL ?? DEFAULT_API_URL),
    content_base_url: without_trailing_slash(
        import.meta.env.VITE_CONTENT_BASE_URL ?? DEFAULT_CONTENT_BASE_URL,
    ),
    site_url: without_trailing_slash(import.meta.env.VITE_SITE_URL ?? DEFAULT_SITE_URL),
    live_update: {
        asset_base_url: release_asset_base_url(
            live_update_config.release_repository,
            live_update_config.release_tag,
        ),
        manifest_url: release_manifest_url(
            live_update_config.release_repository,
            live_update_config.release_tag,
            live_update_config.manifest_asset_name,
        ),
        native_version_code: live_update_config.native_version_code,
    },
} as const;
