import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
    const api_url = import.meta.env.PUBLIC_API_URL
        || "https://acc-clubhub-events-ms.vercel.app";
    const response = await fetch(
        `${api_url}/api/admin/events/${params.id}/reschedule`,
        {
            method: "POST",
            headers: {
                Cookie: request.headers.get("cookie") || "",
                "Content-Type": "application/json",
            },
            body: await request.text(),
        },
    );
    return new Response(await response.text(), {
        status: response.status,
        headers: {
            "Content-Type": "application/json", "Cache-Control": "no-store",
        },
    });
};
