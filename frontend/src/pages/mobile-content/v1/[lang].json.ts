import type { APIRoute, GetStaticPaths } from "astro";

import {
    MOBILE_LOCALES,
    type MobileLocale,
} from "../../../../../shared/mobile_content";
import {
    create_mobile_content_feed,
    DEFAULT_MOBILE_SITE_URL,
} from "../../../lib/mobile_content/feed";
import { build_mobile_items } from "../../../lib/mobile_content/build_items";

export const prerender = true;

export const GET: APIRoute = async ({ params }) => {
    const locale = params.lang;
    if (!MOBILE_LOCALES.includes(locale as MobileLocale)) {
        return new Response(JSON.stringify({ error: "Invalid language" }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        });
    }

    const mobile_locale = locale as MobileLocale;
    const site_url =
        import.meta.env.PUBLIC_SITE_URL ?? DEFAULT_MOBILE_SITE_URL;
    const minimum_app_version =
        import.meta.env.MOBILE_MINIMUM_APP_VERSION ?? "0.1.0";
    const items = await build_mobile_items(mobile_locale, site_url);
    const feed = create_mobile_content_feed(
        mobile_locale,
        items,
        new Date().toISOString(),
        minimum_app_version,
    );

    return new Response(JSON.stringify(feed), {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
            "Content-Type": "application/json; charset=utf-8",
            ETag: `\"${feed.content_revision}\"`,
            "X-Content-Type-Options": "nosniff",
        },
        status: 200,
    });
};

export const getStaticPaths: GetStaticPaths = () =>
    MOBILE_LOCALES.map((locale) => ({ params: { lang: locale } }));
