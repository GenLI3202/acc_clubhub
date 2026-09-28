import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

import { resolveRecurringEvents } from "../../../lib/events/recurringEvents";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
    const slug = params.slug;
    if (!slug) {
        return new Response(null, { status: 404 });
    }

    const published = await getCollection(
        "events",
        ({ data }) => data.status === "published",
    );
    const occurrences = resolveRecurringEvents(published);
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

    const event = match.data;
    return new Response(
        JSON.stringify({
            slug: event.slug,
            title: event.title,
            description: event.description ?? null,
            event_date: new Date(event.date).toISOString(),
            location: event.location,
            event_type: event.eventType ?? "social-ride",
            max_participants: event.maxParticipants ?? null,
            registration_deadline: event.registrationDeadline
                ? new Date(event.registrationDeadline).toISOString()
                : null,
            registration_reopened: event.registrationReopened === true,
            registration_link: event.registrationLink ?? null,
            distance_km: event.distanceKm ?? null,
            route_komoot_url: event.routeKomootUrl ?? null,
            wechat_qr_code: event.wechatQrCode ?? null,
            acc_official_ride: event.ACCOfficialRide === true,
        }),
        {
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        },
    );
};
