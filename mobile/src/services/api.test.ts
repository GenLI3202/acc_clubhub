import { afterEach, describe, expect, it, vi } from "vitest";

import type { MobileContentItem } from "../../../shared/mobile_content";
import {
    ApiError,
    get_event_status,
    get_public_event_statuses,
    IndeterminateRegistrationError,
    submit_registration,
} from "./api";

const item: MobileContentItem = {
    body_html: "",
    description: "",
    featured: false,
    id: "event:ride",
    links: [],
    locale: "en",
    metadata: { event_date: "2027-02-01T10:00:00Z" },
    slug: "ride",
    title: "Ride",
    type: "event",
};
const fields = {
    email: "rider@example.test",
    insurance_accepted: true,
    name: "Rider",
    notes: "",
    privacy_accepted: true,
    subscribe: false,
};

afterEach(() => vi.unstubAllGlobals());

describe("get_event_status", () => {
    it("rejects malformed live data instead of opening registration", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ slug: "ride", is_public: true }), {
                    status: 200,
                }),
            ),
        );
        await expect(get_event_status("ride")).rejects.toBeInstanceOf(ApiError);
    });

    it("accepts a matching FastAPI event status", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        available_spots: 2,
                        cancellation_reason: null,
                        current_participants: 1,
                        event_date: "2030-07-01T08:00:00Z",
                        is_cancelled: false,
                        is_public: true,
                        max_participants: 3,
                        registration_deadline: null,
                        slug: "ride",
                    }),
                    { status: 200 },
                ),
            ),
        );
        await expect(get_event_status("ride")).resolves.toMatchObject({
            kind: "live",
            value: { slug: "ride", available_spots: 2 },
        });
    });
});

describe("get_public_event_statuses", () => {
    it("rejects malformed list items", async () => {
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValue(
                    new Response(JSON.stringify([{ slug: "ride" }]), { status: 200 }),
                ),
        );
        await expect(get_public_event_statuses()).rejects.toBeInstanceOf(ApiError);
    });
});

describe("submit_registration", () => {
    it("sends rider data and slug without editable event metadata", async () => {
        const fetch_mock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({ message: "registered", status: "confirmed" }),
                {
                    status: 200,
                },
            ),
        );
        vi.stubGlobal("fetch", fetch_mock);

        await submit_registration(item, "en", fields);

        const request = fetch_mock.mock.calls[0]?.[1] as RequestInit;
        expect(JSON.parse(request.body as string)).toEqual({
            ...fields,
            event_slug: "ride",
            lang: "en",
        });
    });

    it("reports an unknown outcome after a network failure without retrying", async () => {
        const fetch_mock = vi.fn().mockRejectedValue(new TypeError("Network failed"));
        vi.stubGlobal("fetch", fetch_mock);
        await expect(submit_registration(item, "en", fields)).rejects.toBeInstanceOf(
            IndeterminateRegistrationError,
        );
        expect(fetch_mock).toHaveBeenCalledTimes(1);
    });

    it("treats a server error as an unknown outcome", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
        );
        await expect(submit_registration(item, "en", fields)).rejects.toBeInstanceOf(
            IndeterminateRegistrationError,
        );
    });

    it("keeps a definite validation rejection separate", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response(null, { status: 400 })),
        );
        await expect(submit_registration(item, "en", fields)).rejects.toBeInstanceOf(
            ApiError,
        );
    });
});
