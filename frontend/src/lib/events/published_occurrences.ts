import { getCollection } from "astro:content";

import { effective_registration_deadline } from "./event_schedule";
import { resolveRecurringEvents } from "./recurringEvents";

export async function get_published_occurrences() {
    const published = await getCollection(
        "events",
        ({ data }) => data.status === "published",
    );
    return resolveRecurringEvents(published);
}

type PublishedOccurrence = Awaited<ReturnType<typeof get_published_occurrences>>[number];

export function serialize_published_occurrence(entry: PublishedOccurrence) {
    const event = entry.data;
    return {
        slug: event.slug,
        title: event.title,
        description: event.description ?? null,
        event_date: new Date(event.date).toISOString(),
        location: event.location,
        event_type: event.eventType ?? "social-ride",
        max_participants: event.maxParticipants ?? null,
        registration_deadline: effective_registration_deadline(
            event.date,
            event.registrationDeadline,
            event.registrationReopened === true,
        ),
        registration_reopened: event.registrationReopened === true,
        registration_link: event.registrationLink ?? null,
        distance_km: event.distanceKm ?? null,
        route_komoot_url: event.routeKomootUrl ?? null,
        wechat_qr_code: event.wechatQrCode ?? null,
        acc_official_ride: event.ACCOfficialRide === true,
    };
}
