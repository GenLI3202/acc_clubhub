import { describe, expect, it } from "vitest";

import type { MobileContentItem } from "../../../shared/mobile_content";
import {
    filter_items_for_view,
    registration_live_is_open,
    registration_time_is_open,
    sort_mobile_items,
} from "./content";

function create_event(slug: string, event_date: string): MobileContentItem {
    return {
        body_html: "",
        description: "",
        featured: false,
        id: `event:${slug}`,
        links: [],
        locale: "en",
        metadata: { event_date },
        slug,
        title: slug,
        type: "event",
    };
}

function create_item(slug: string, type: MobileContentItem["type"]): MobileContentItem {
    return {
        body_html: "",
        description: "",
        featured: false,
        id: `${type}:${slug}`,
        links: [],
        locale: "en",
        metadata: {},
        slug,
        title: slug,
        type,
    };
}

describe("filter_items_for_view", () => {
    const items = [
        create_item("event", "event"),
        create_item("media", "media"),
        create_item("route", "route"),
        create_item("gear", "gear"),
        create_item("training", "training"),
    ];

    it("groups routes into the media view", () => {
        expect(filter_items_for_view(items, "media").map((item) => item.type)).toEqual([
            "media",
            "route",
        ]);
    });

    it.each([
        ["events", "event"],
        ["gear", "gear"],
        ["training", "training"],
    ] as const)("filters the %s view", (view, type) => {
        expect(filter_items_for_view(items, view).map((item) => item.type)).toEqual([
            type,
        ]);
    });

    it("does not mix content into the about view", () => {
        expect(filter_items_for_view(items, "about")).toEqual([]);
    });
});

describe("sort_mobile_items", () => {
    it("puts the next event first", () => {
        const later = create_event("later", "2027-02-01T10:00:00Z");
        const sooner = create_event("sooner", "2027-01-01T10:00:00Z");

        expect(sort_mobile_items([later, sooner])).toEqual([sooner, later]);
    });

    it("uses the live rescheduled date to order activities", () => {
        const moved = create_event("moved", "2027-01-01T10:00:00Z");
        const regular = create_event("regular", "2027-02-01T10:00:00Z");
        const live_events = {
            moved: {
                available_spots: 2,
                cancellation_reason: null,
                current_participants: 0,
                event_date: "2027-03-01T10:00:00Z",
                is_cancelled: false,
                is_public: true,
                max_participants: 2,
                registration_deadline: null,
                slug: "moved",
            },
        };

        expect(sort_mobile_items([moved, regular], live_events)).toEqual([
            regular,
            moved,
        ]);
    });
});

describe("registration_time_is_open", () => {
    it("closes registration after its deadline", () => {
        const item = create_event("ride", "2027-02-01T10:00:00Z");
        item.metadata.registration_deadline = "2026-12-31T10:00:00Z";

        expect(registration_time_is_open(item, new Date("2027-01-01T10:00:00Z"))).toBe(
            false,
        );
    });

    it("honors an explicit registration reopening", () => {
        const item = create_event("ride", "2027-02-01T10:00:00Z");
        item.metadata.registration_deadline = "2026-12-31T10:00:00Z";
        item.metadata.registration_reopened = true;

        expect(registration_time_is_open(item, new Date("2027-01-01T10:00:00Z"))).toBe(
            true,
        );
    });
});

describe("registration_live_is_open", () => {
    const live_event = {
        available_spots: 0,
        cancellation_reason: null,
        current_participants: 12,
        event_date: "2027-02-01T10:00:00Z",
        is_cancelled: false,
        is_public: true,
        max_participants: 12,
        registration_deadline: "2027-01-31T10:00:00Z",
        slug: "ride",
    };

    it("uses the live deadline even when cached content has an old date", () => {
        const stale = create_event("ride", "2026-01-01T10:00:00Z");
        expect(
            registration_live_is_open(
                stale,
                { kind: "live", value: live_event },
                new Date("2027-01-01T10:00:00Z"),
            ),
        ).toBe(true);
    });

    it("rejects unknown, private, cancelled and expired events", () => {
        const item = create_event("ride", live_event.event_date);
        const now = new Date("2027-01-01T10:00:00Z");
        expect(registration_live_is_open(item, { kind: "not_synced" }, now)).toBe(
            false,
        );
        expect(
            registration_live_is_open(
                item,
                { kind: "live", value: { ...live_event, is_public: false } },
                now,
            ),
        ).toBe(false);
        expect(
            registration_live_is_open(
                item,
                { kind: "live", value: { ...live_event, is_cancelled: true } },
                now,
            ),
        ).toBe(false);
        expect(
            registration_live_is_open(
                item,
                {
                    kind: "live",
                    value: {
                        ...live_event,
                        registration_deadline: "2026-12-31T10:00:00Z",
                    },
                },
                now,
            ),
        ).toBe(false);
    });
});
