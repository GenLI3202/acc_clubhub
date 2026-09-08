import { describe, expect, it } from "vitest";

import type { MobileContentItem } from "../../../shared/mobile_content";
import { registration_time_is_open, sort_mobile_items } from "./content";

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
