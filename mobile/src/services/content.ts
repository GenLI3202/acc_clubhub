import {
    is_mobile_content_feed,
    type MobileContentFeed,
    type MobileLocale,
} from "../../../shared/mobile_content";
import { APP_CONFIG, APP_VERSION } from "../config";

const CONTENT_CACHE_NAME = "acc-mobile-content-v1";
const FETCH_TIMEOUT_MS = 8_000;

export type ContentSource = "bundled" | "cache" | "network";

export interface ContentResult {
    feed: MobileContentFeed;
    source: ContentSource;
}

export class ContentUpdateRequiredError extends Error {
    public constructor() {
        super("The mobile content requires a newer app version");
        this.name = "ContentUpdateRequiredError";
    }
}

function compare_versions(left: string, right: string): number {
    const left_parts = left.split(".").map(Number);
    const right_parts = right.split(".").map(Number);
    const length = Math.max(left_parts.length, right_parts.length);

    for (let index = 0; index < length; index += 1) {
        const difference = (left_parts[index] ?? 0) - (right_parts[index] ?? 0);
        if (difference !== 0) {
            return difference;
        }
    }
    return 0;
}

function parse_feed(value: unknown, locale: MobileLocale): MobileContentFeed {
    if (!is_mobile_content_feed(value) || value.locale !== locale) {
        throw new Error("Invalid mobile content feed");
    }
    if (compare_versions(APP_VERSION, value.minimum_app_version) < 0) {
        throw new ContentUpdateRequiredError();
    }
    return value;
}

async function read_response(
    response: Response,
    locale: MobileLocale,
): Promise<MobileContentFeed> {
    if (!response.ok) {
        throw new Error(`Content request failed with ${response.status}`);
    }
    return parse_feed(await response.json(), locale);
}

async function cache_feed(url: string, response: Response): Promise<void> {
    if (!("caches" in globalThis)) {
        return;
    }
    const cache = await caches.open(CONTENT_CACHE_NAME);
    await cache.put(url, response);
}

async function read_cached_feed(
    url: string,
    locale: MobileLocale,
): Promise<MobileContentFeed | undefined> {
    if (!("caches" in globalThis)) {
        return undefined;
    }
    const cache = await caches.open(CONTENT_CACHE_NAME);
    const response = await cache.match(url);
    return response ? read_response(response, locale) : undefined;
}

async function read_bundled_feed(locale: MobileLocale): Promise<MobileContentFeed> {
    const response = await fetch(`/mobile-content/v1/${locale}.json`);
    return read_response(response, locale);
}

export async function load_content_feed(locale: MobileLocale): Promise<ContentResult> {
    const url = `${APP_CONFIG.content_base_url}/${locale}.json`;
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
        });
        const feed = await read_response(response.clone(), locale);
        await cache_feed(url, response);
        return { feed, source: "network" };
    } catch (error) {
        if (error instanceof ContentUpdateRequiredError) {
            throw error;
        }

        try {
            const cached_feed = await read_cached_feed(url, locale);
            if (cached_feed) {
                return { feed: cached_feed, source: "cache" };
            }
        } catch (cache_error) {
            if (cache_error instanceof ContentUpdateRequiredError) {
                throw cache_error;
            }
        }

        return {
            feed: await read_bundled_feed(locale),
            source: "bundled",
        };
    } finally {
        globalThis.clearTimeout(timeout);
    }
}
