export interface MobileEnvironment {
    api_url: string;
    content_base_url: string;
    site_url: string;
    stage: "production" | "staging";
}

const PRODUCTION_API = "https://acc-clubhub-events-ms.vercel.app";
const PRODUCTION_CONTENT = "https://www.across-cc.de/mobile-content/v1";
const PRODUCTION_SITE = "https://www.across-cc.de";

function normalize_https_url(value: string): string {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) {
        throw new Error("Mobile endpoints must be HTTPS URLs without credentials");
    }
    return url.toString().replace(/\/+$/, "");
}

export function resolve_mobile_environment(values: {
    api_url?: string;
    content_base_url?: string;
    site_url?: string;
    stage?: string;
}): MobileEnvironment {
    const stage = values.stage ?? "production";
    if (stage !== "production" && stage !== "staging") {
        throw new Error("VITE_APP_ENV must be production or staging");
    }
    if (stage === "staging") {
        if (!values.api_url || !values.content_base_url || !values.site_url) {
            throw new Error("Staging requires explicit API, content and site URLs");
        }
        const api_url = normalize_https_url(values.api_url);
        const content_base_url = normalize_https_url(values.content_base_url);
        const site_url = normalize_https_url(values.site_url);
        const production_hosts = new Set([
            new URL(PRODUCTION_API).hostname,
            new URL(PRODUCTION_SITE).hostname,
        ]);
        if (
            [api_url, content_base_url, site_url].some((url) =>
                production_hosts.has(new URL(url).hostname),
            )
        ) {
            throw new Error("Staging endpoints must not use production URLs");
        }
        return { api_url, content_base_url, site_url, stage };
    }
    return {
        api_url: normalize_https_url(values.api_url ?? PRODUCTION_API),
        content_base_url: normalize_https_url(
            values.content_base_url ?? PRODUCTION_CONTENT,
        ),
        site_url: normalize_https_url(values.site_url ?? PRODUCTION_SITE),
        stage,
    };
}
