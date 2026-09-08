import { describe, expect, it } from "vitest";

import type { MobileContentItem } from "../../../shared/mobile_content";
import {
    filter_items_for_view,
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
