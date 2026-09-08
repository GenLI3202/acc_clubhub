import type { MobileContentItem, MobileLocale } from "../../../shared/mobile_content";
import { APP_CONFIG } from "../config";

export interface EventLiveState {
    available_spots: number | null;
    cancellation_reason: string | null;
    current_participants: number;
    event_date: string;
    is_cancelled: boolean;
    is_public: boolean;
    max_participants: number | null;
    registration_deadline: string | null;
    slug: string;
}

export type EventStatusResult =
    { kind: "live"; value: EventLiveState } | { kind: "not_synced" };

export interface RegistrationFields {
    email: string;
    name: string;
    notes: string;
    privacy_accepted: boolean;
    subscribe: boolean;
}

export interface RegistrationResult {
    message: string;
    status: "confirmed" | "waitlist";
    waitlist_position?: number | null;
}

export class ApiError extends Error {
    public readonly status: number;

    public constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

async function response_error(response: Response): Promise<ApiError> {
    let message = `Request failed with ${response.status}`;
    try {
        const payload = (await response.json()) as {
            detail?: string | { message?: string };
        };
        if (typeof payload.detail === "string") {
            message = payload.detail;
        } else if (payload.detail?.message) {
            message = payload.detail.message;
        }
    } catch {
        // Keep the status-based message for non-JSON errors.
    }
    return new ApiError(message, response.status);
}

export async function get_event_status(slug: string): Promise<EventStatusResult> {
    const response = await fetch(
        `${APP_CONFIG.api_url}/api/events/${encodeURIComponent(slug)}`,
        { headers: { Accept: "application/json" } },
    );
    if (response.status === 404) {
        return { kind: "not_synced" };
    }
    if (!response.ok) {
        throw await response_error(response);
    }
    return {
        kind: "live",
        value: (await response.json()) as EventLiveState,
    };
}

export async function submit_registration(
    item: MobileContentItem,
    locale: MobileLocale,
    fields: RegistrationFields,
): Promise<RegistrationResult> {
    const komoot_link = item.links.find((link) => link.kind === "komoot");
    const response = await fetch(`${APP_CONFIG.api_url}/api/rsvp`, {
        body: JSON.stringify({
            ...fields,
            event_date: item.metadata.event_date,
            event_location: item.metadata.location ?? "",
            event_slug: item.slug,
            event_title: item.title,
            event_type: item.metadata.event_type ?? "social-ride",
            lang: locale,
            max_participants: item.metadata.max_participants,
            registration_deadline: item.metadata.registration_deadline,
            route_komoot_url: komoot_link?.url,
            distance_km: item.metadata.distance_km,
            wechat_qr_code: item.metadata.wechat_qr_code,
        }),
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    if (!response.ok) {
        throw await response_error(response);
    }
    return (await response.json()) as RegistrationResult;
}

export async function submit_subscription(
    locale: MobileLocale,
    name: string,
    email: string,
): Promise<void> {
    const response = await fetch(`${APP_CONFIG.api_url}/api/subscribe`, {
        body: JSON.stringify({
            email,
            lang: locale,
            name,
            privacy_accepted: true,
        }),
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    if (!response.ok) {
        throw await response_error(response);
    }
}
