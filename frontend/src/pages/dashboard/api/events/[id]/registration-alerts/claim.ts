import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
    const api_url =
        import.meta.env.PUBLIC_API_URL ||
        "https://acc-clubhub-events-ms.vercel.app";
    const cookie = request.headers.get("cookie") || "";
    const { id } = params;
    const upstream = await fetch(
        `${api_url}/api/admin/events/${id}/registration-alerts/claim`,
        {
            method: "POST",
            headers: { Cookie: cookie },
        },
    );
    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
    });
};
