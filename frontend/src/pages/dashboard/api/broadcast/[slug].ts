// dashboard/api/broadcast/[slug].ts — SSR proxy for POST /api/admin/broadcast/{slug}
// Browser → /dashboard/api/broadcast/{slug} (same-origin, no CORS)
// Astro SSR → FastAPI backend (server-to-server, cookie forwarded)

import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
    const apiUrl =
        import.meta.env.PUBLIC_API_URL ||
        "https://acc-clubhub-events-ms.vercel.app";

    const cookie = request.headers.get("cookie") || "";
    const { slug } = params;

    const upstream = await fetch(
        `${apiUrl}/api/admin/broadcast/${slug}`,
        {
            method: "POST",
            headers: {
                Cookie: cookie,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        }
    );

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
    });
};
