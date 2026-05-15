// Proxy for PATCH and DELETE /api/admin/season/{id} → backend /api/admin/season/slots/{id}
import type { APIRoute } from "astro";

export const prerender = false;

const backendUrl = (id: string) =>
  `${import.meta.env.PUBLIC_API_URL || "https://acc-clubhub-events-ms.vercel.app"}/api/admin/season/slots/${id}`;

async function proxy(request: Request, id: string, method: string): Promise<Response> {
  const cookie = request.headers.get("cookie") || "";
  try {
    const init: RequestInit = { method, headers: { Cookie: cookie } };
    if (method === "PATCH") {
      init.headers = { ...init.headers as Record<string, string>, "Content-Type": "application/json" };
      init.body = await request.text();
    }
    const res = await fetch(backendUrl(id), init);
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
}

export const PATCH: APIRoute = ({ request, params }) =>
  proxy(request, params.id!, "PATCH");

export const DELETE: APIRoute = ({ request, params }) =>
  proxy(request, params.id!, "DELETE");
