// dashboard/api/subscribers/[id]/toggle.ts — SSR proxy for subscriber toggle
// Browser → /dashboard/api/subscribers/{id}/toggle (same-origin, no CORS)
// Astro SSR → FastAPI backend (server-to-server, cookie forwarded)
//
// Fixes #77: direct browser fetch to FastAPI fails because:
//   - FastAPI CORS: allow_credentials=False (can't combine with wildcard origin)
//   - Auth cookie: SameSite=Lax (browser won't send it cross-origin)

import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
    const apiUrl =
        import.meta.env.PUBLIC_API_URL ||
        "https://acc-clubhub-events-ms.vercel.app";

    const cookie = request.headers.get("cookie") || "";
    const { id } = params;

    const upstream = await fetch(
        `${apiUrl}/api/admin/subscribers/${id}/toggle`,
        {
            method: "POST",
            headers: { Cookie: cookie },
        }
    );

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
    });
};
