import live_update_config from "../live_update.config.json";
import { resolve_mobile_environment } from "./lib/environment";
import { release_asset_base_url, release_manifest_url } from "./lib/live_update";

const environment = resolve_mobile_environment({
    api_url: import.meta.env.VITE_API_URL,
    content_base_url: import.meta.env.VITE_CONTENT_BASE_URL,
    site_url: import.meta.env.VITE_SITE_URL,
    stage: import.meta.env.VITE_APP_ENV,
});

export const APP_VERSION = "0.3.2";

export const APP_CONFIG = {
    ...environment,
    live_update: {
        enabled: environment.stage === "production",
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
        supported_native_version_codes:
            live_update_config.supported_native_version_codes,
        legacy_native_version_code: live_update_config.legacy_native_version_code,
    },
} as const;
