import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
    const apiUrl =
        import.meta.env.PUBLIC_API_URL ||
        "https://acc-clubhub-events-ms.vercel.app";

    const cookie = request.headers.get("cookie") || "";
    const { id } = params;
    const body = await request.text();

    const upstream = await fetch(
        `${apiUrl}/api/admin/events/${id}/rsvp/ride-leader/undo`,
        {
            method: "POST",
            headers: {
                Cookie: cookie,
                "Content-Type": "application/json",
            },
            body,
        }
    );

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
    });
};
