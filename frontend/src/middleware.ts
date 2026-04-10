import { defineMiddleware } from "astro:middleware";

/**
 * Astro's i18n middleware returns 404 for non-locale-prefixed routes
 * when prefixDefaultLocale is true. Dashboard routes are deliberately
 * locale-free (admin panel), so we override the status back to 200.
 *
 * We consume the body via response.text() before re-wrapping so that
 * the ReadableStream is not transferred in an already-consumed state,
 * which can happen on Vercel's SSR edge runtime.
 */
export const onRequest = defineMiddleware(async (context, next) => {
    const response = await next();
    const path = context.url.pathname;

    if (path.startsWith("/dashboard") && response.status === 404) {
        const body = await response.text();
        return new Response(body, {
            status: 200,
            headers: response.headers,
        });
    }

    return response;
});
