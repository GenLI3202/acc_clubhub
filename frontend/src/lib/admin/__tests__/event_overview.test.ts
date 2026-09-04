import { describe, expect, it, vi } from "vitest";

import { loadAdminEventData } from "../event_overview";

const eventRow = {
    id: 42,
    title: "ACC After Work Ride",
    slug: "afterwork-ride-2026-09-08",
    event_date: "2026-09-08T16:00:00.000Z",
    location: "Munich",
    event_type: "after-work" as const,
    max_participants: 20,
    registration_deadline: null,
    confirmed_count: 7,
    waitlist_count: 1,
    cancelled_count: 0,
    spots_remaining: 13,
    cancellation_reason: null,
    cancelled_at: null,
};

describe("loadAdminEventData", () => {
    it("uses the overview response without an extra request", async () => {
        const loadEvents = vi.fn();

        const result = await loadAdminEventData({
            loadOverview: async () => new Response(JSON.stringify({
                schema: { ok: true, missing_columns: [] },
                events: [eventRow],
            }), { status: 200 }),
            loadEvents,
        });

        expect(result.events).toEqual([eventRow]);
        expect(result.warning).toBeNull();
        expect(result.unauthorized).toBe(false);
        expect(loadEvents).not.toHaveBeenCalled();
    });

    it("falls back to saved event stats when overview sync fails", async () => {
        const result = await loadAdminEventData({
            loadOverview: async () => new Response(null, { status: 503 }),
            loadEvents: async () => new Response(JSON.stringify([eventRow]), {
                status: 200,
            }),
        });

        expect(result.events).toEqual([eventRow]);
        expect(result.warning).toContain("sync unavailable");
        expect(result.unauthorized).toBe(false);
    });

    it("preserves an unauthorized response from the fallback", async () => {
        const result = await loadAdminEventData({
            loadOverview: async () => {
                throw new Error("overview unavailable");
            },
            loadEvents: async () => new Response(null, { status: 401 }),
        });

        expect(result.events).toEqual([]);
        expect(result.unauthorized).toBe(true);
    });
});
