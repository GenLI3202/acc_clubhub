// dashboard/api/events.ts — SSR proxy for GET /api/admin/events
// Browser → /dashboard/api/events (same-origin, no CORS)
// Astro SSR → FastAPI backend (server-to-server, cookie forwarded)
//
// Fixes #78: the broadcast dropdown was calling the FastAPI backend directly
// from the browser with credentials:include, which fails because:
//   - FastAPI CORS: allow_credentials=False
//   - Auth cookie: SameSite=Lax (not sent in cross-origin fetch)

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    const apiUrl =
        import.meta.env.PUBLIC_API_URL ||
        "https://acc-clubhub-events-ms.vercel.app";

    const cookie = request.headers.get("cookie") || "";

    const upstream = await fetch(`${apiUrl}/api/admin/events`, {
        headers: { Cookie: cookie },
    });

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
    });
};
