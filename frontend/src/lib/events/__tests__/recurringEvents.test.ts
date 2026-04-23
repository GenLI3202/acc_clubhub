import { describe, expect, it } from "vitest";
import { resolveEventEntryBySlug, resolveRecurringEvent } from "../recurringEvents";

const baseEvent = {
    id: "zh/afterwork-ride-2026-04-23.md",
    data: {
        slug: "afterwork-ride-2026-04-23",
        title: "Afterwork Ride",
        description: "A weekly ride.",
        location: "Route starting point",
        date: "2026-04-23T15:30:00.000Z",
        author: "ACC Club",
        status: "published",
        eventType: "social-ride",
        coverImage: "",
        cover: undefined,
        xiaohongshuUrl: undefined,
        maxParticipants: undefined,
        registrationDeadline: null,
        registrationLink: undefined,
        displaySection: "regular",
        featured: undefined,
        recurring: {
            enabled: true,
            frequency: "weekly",
            intervalWeeks: 1,
            timezone: "Europe/Berlin",
            rolloverTime: "22:00",
            slugBase: "afterwork-ride",
            registrationDeadlineHoursBefore: 19.5,
            paused: false,
        },
        lang: "zh",
    },
    body: "",
    collection: "events",
} as any;

describe("resolveRecurringEvent", () => {
    it("keeps the source occurrence before the Berlin rollover time", () => {
        const event = resolveRecurringEvent(
            baseEvent,
            new Date("2026-04-23T19:59:00.000Z"),
        );

        expect(event.data.slug).toBe("afterwork-ride-2026-04-23");
        expect(event.data.date).toBe("2026-04-23T15:30:00.000Z");
    });

    it("rolls weekly regular events after the Berlin rollover time", () => {
        const event = resolveRecurringEvent(
            baseEvent,
            new Date("2026-04-23T20:00:00.000Z"),
        );

        expect(event.data.slug).toBe("afterwork-ride-2026-04-30");
        expect(event.data.date).toBe("2026-04-30T15:30:00.000Z");
        expect(event.data.registrationDeadline).toBe("2026-04-29T20:00:00.000Z");
    });
});

describe("resolveEventEntryBySlug", () => {
    it("resolves generated recurring slugs for event detail routes", () => {
        const event = resolveEventEntryBySlug(
            [baseEvent],
            "afterwork-ride-2026-04-30",
            "zh",
            new Date("2026-04-24T08:00:00.000Z"),
        );

        expect(event?.data.slug).toBe("afterwork-ride-2026-04-30");
        expect(event?.sourceSlug).toBe("afterwork-ride-2026-04-23");
    });
});
