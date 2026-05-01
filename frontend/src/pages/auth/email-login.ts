import type { APIRoute } from "astro";

export const prerender = false;

function get_api_url(): string {
    return (
        import.meta.env.PUBLIC_API_URL ||
        "https://acc-clubhub-events-ms.vercel.app"
    );
}

function normalize_set_cookie(value: string): string {
    if (!import.meta.env.DEV) {
        return value;
    }

    return value
        .replace(/;\s*Secure/gi, "")
        .replace(/;\s*Domain=[^;]+/gi, "");
}

export const POST: APIRoute = async ({ request }) => {
    const body = await request.text();
    const upstream = await fetch(`${get_api_url()}/auth/email-login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body,
    });

    const responseBody = await upstream.text();
    const headers = new Headers({
        "Content-Type": upstream.headers.get("Content-Type")
            || "application/json",
    });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
        headers.set("set-cookie", normalize_set_cookie(setCookie));
    }

    return new Response(responseBody, {
        status: upstream.status,
        headers,
    });
};
