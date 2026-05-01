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

export const GET: APIRoute = async ({ request }) => {
    const cookie = request.headers.get("cookie") || "";
    const upstream = await fetch(`${get_api_url()}/auth/logout`, {
        headers: { Cookie: cookie },
        redirect: "manual",
    });

    const headers = new Headers({
        Location: "/dashboard/login",
    });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
        headers.set("set-cookie", normalize_set_cookie(setCookie));
    }

    return new Response(null, {
        status: 302,
        headers,
    });
};
