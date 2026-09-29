import type { APIRoute } from "astro";

import {
  MOBILE_LOCALES,
  type MobileLocale,
} from "../../../../../../shared/mobile_content";
export const prerender = false;

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
    import.meta.env.PUBLIC_SITE_URL ?? "https://www.across-cc.de";
  const minimum_app_version =
    import.meta.env.MOBILE_MINIMUM_APP_VERSION ?? "0.1.0";
  try {
    const { build_mobile_items } =
      await import("../../../../lib/mobile_content/build_items");
    const { create_mobile_content_feed } =
      await import("../../../../lib/mobile_content/feed");
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
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        ETag: `"${feed.content_revision}"`,
        "X-Content-Type-Options": "nosniff",
        "X-Mobile-Content-Source": "live",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Live mobile feed failed; serving published snapshot", error);
    const snapshot = await fetch(
      new URL(`/mobile-content/v1/${mobile_locale}.json`, site_url),
      { signal: AbortSignal.timeout(8_000) },
    ).catch(() => undefined);
    if (!snapshot?.ok) {
      return new Response(
        JSON.stringify({ error_code: "MOBILE_CONTENT_UNAVAILABLE" }),
        { status: 503 },
      );
    }
    return new Response(await snapshot.text(), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Mobile-Content-Source": "published-snapshot",
        "X-Mobile-Fallback-Type":
          error instanceof Error ? error.name : "UnknownError",
      },
      status: 200,
    });
  }
};
