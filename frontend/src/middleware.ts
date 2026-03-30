import { defineMiddleware } from "astro:middleware";

/**
 * Astro's i18n middleware returns 404 for non-locale-prefixed routes
 * when prefixDefaultLocale is true. Dashboard and API routes don't use
 * i18n, so override the status back to 200 when the page rendered
 * successfully.
 */
export const onRequest = defineMiddleware(async (context, next) => {
    const response = await next();
    const path = context.url.pathname;

    if (path.startsWith("/dashboard") && response.status === 404) {
        return new Response(response.body, {
            status: 200,
            headers: response.headers,
        });
    }

    return response;
});
