import type { APIRoute } from "astro";

import {
    get_published_occurrences,
    serialize_published_occurrence,
} from "../../../lib/events/published_occurrences";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
    const slug = params.slug;
    if (!slug) {
        return new Response(null, { status: 404 });
    }

    const occurrences = await get_published_occurrences();
    const match = ["en", "zh", "de"]
        .map((locale) =>
            occurrences.find(
                (event) =>
                    event.data.slug === slug && event.id.startsWith(`${locale}/`),
            ),
        )
        .find(Boolean);
    if (!match) {
        return new Response(
            JSON.stringify({
                error_code: "EVENT_NOT_PUBLISHED",
                message: "Published event not found",
            }),
            {
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
                status: 404,
            },
        );
    }

    return new Response(
        JSON.stringify(serialize_published_occurrence(match)),
        {
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        },
    );
};
