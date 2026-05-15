// Server-side proxy for POST /api/admin/season/slots/generate.
// Forwards the browser cookie header server-to-server so the cross-origin
// CORS restriction on the main API never comes into play.
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const apiUrl =
    import.meta.env.PUBLIC_API_URL ||
    "https://acc-clubhub-events-ms.vercel.app";
  const cookie = request.headers.get("cookie") || "";

  try {
    const body = await request.json();
    const res = await fetch(`${apiUrl}/api/admin/season/slots/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};
