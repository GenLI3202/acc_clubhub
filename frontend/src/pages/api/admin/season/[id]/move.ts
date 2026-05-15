// Proxy for POST /api/admin/season/{id}/move → backend
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const apiUrl = import.meta.env.PUBLIC_API_URL || "https://acc-clubhub-events-ms.vercel.app";
  const cookie = request.headers.get("cookie") || "";
  try {
    const body = await request.text();
    const res = await fetch(`${apiUrl}/api/admin/season/slots/${params.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body,
    });
    const data = await res.text();
    return new Response(data, {
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
