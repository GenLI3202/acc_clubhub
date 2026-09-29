import type { APIRoute } from "astro";

import {
    get_published_occurrences,
    serialize_published_occurrence,
} from "../../../lib/events/published_occurrences";

export const prerender = false;

export const GET: APIRoute = async () => {
    const occurrences = await get_published_occurrences();
    const selected = new Map<string, (typeof occurrences)[number]>();
    for (const locale of ["en", "zh", "de"]) {
        for (const entry of occurrences) {
            if (
                entry.id.startsWith(`${locale}/`) &&
                !selected.has(entry.data.slug)
            ) {
                selected.set(entry.data.slug, entry);
            }
        }
    }
    const events = [...selected.values()]
        .map(serialize_published_occurrence)
        .sort((left, right) => left.slug.localeCompare(right.slug));
    return new Response(JSON.stringify({ events }), {
        headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
        },
        status: 200,
    });
};
