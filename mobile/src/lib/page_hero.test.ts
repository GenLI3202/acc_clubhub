import { describe, expect, it } from "vitest";

import type { MobileContentItem } from "../../../shared/mobile_content";
import type { EventLiveState } from "../services/api";
import { create_page_hero, section_title } from "./page_hero";

function create_item(
    type: MobileContentItem["type"],
    options: Partial<MobileContentItem> = {},
): MobileContentItem {
    return {
        body_html: "",
        cover_image: `https://example.com/${type}.jpg`,
        description: `${type} description`,
        featured: false,
        id: `${type}:item`,
        links: [],
        locale: "en",
        metadata: {},
        slug: `${type}-item`,
        title: `${type} title`,
        type,
        ...options,
    };
}

describe("create_page_hero", () => {
    it("uses the featured event content and action", () => {
        const regular = create_item("event");
        const featured = create_item("event", {
            featured: true,
            id: "event:featured",
            metadata: {
                event_date: "2099-09-08T15:50:00.000Z",
                location: "München",
            },
            title: "Featured ride",
        });

        const hero = create_page_hero(
            "events",
            [regular, featured],
            "en",
            "https://www.across-cc.de",
        );

        expect(hero.item).toBe(featured);
        expect(hero.title).toBe("Featured ride");
        expect(hero.action_target).toBe("content");
        expect(hero.action_label).toBe("Details");
        expect(hero.meta).toContain("München");
    });

    it("skips a cancelled featured ride when live status arrives", () => {
        const cancelled = create_item("event", {
            featured: true,
            id: "event:cancelled",
            metadata: { event_date: "2099-09-08T15:50:00.000Z" },
            slug: "cancelled",
        });
        const active = create_item("event", {
            id: "event:active",
            metadata: { event_date: "2099-09-09T15:50:00.000Z" },
            slug: "active",
        });
        const cancelled_status: EventLiveState = {
            available_spots: 15,
            cancellation_reason: "insufficient_staff",
            current_participants: 0,
            event_date: "2099-09-08T15:50:00.000Z",
            is_cancelled: true,
            is_public: true,
            max_participants: 15,
            registration_deadline: null,
            slug: "cancelled",
        };
        const active_status: EventLiveState = {
            ...cancelled_status,
            cancellation_reason: null,
            event_date: "2099-09-09T15:50:00.000Z",
            is_cancelled: false,
            slug: "active",
        };

        const hero = create_page_hero(
            "events",
            [cancelled, active],
            "zh",
            "https://www.across-cc.de",
            { cancelled: cancelled_status, active: active_status },
        );

        expect(hero.item).toBe(active);
        expect(hero.action_label).toBe("报名");
    });

    it("does not feature an event that has ended", () => {
        const past = create_item("event", {
            featured: true,
            metadata: { event_date: "2020-01-01T10:00:00Z" },
        });

        const hero = create_page_hero(
            "events",
            [past],
            "zh",
            "https://www.across-cc.de",
        );

        expect(hero.item).toBeUndefined();
        expect(hero.action_target).toBeUndefined();
    });

    it("uses media rather than route artwork for the combined view", () => {
        const route = create_item("route", { featured: true });
        const media = create_item("media", { featured: true });

        const hero = create_page_hero(
            "media",
            [route, media],
            "zh",
            "https://www.across-cc.de",
        );

        expect(hero.image_url).toBe(media.cover_image);
        expect(hero.title).toBe("车影骑踪");
        expect(hero.description).toBe("影像作品 · 骑友访谈 · 翻山越岭");
    });

    it("uses the official about image and copy", () => {
        const hero = create_page_hero("about", [], "en", "https://www.across-cc.de");

        expect(hero.image_url).toBe("https://www.across-cc.de/images/about/hero.webp");
        expect(hero.title).toBe("Across Cycling Club");
        expect(hero.description).toContain("road-cycling club in Munich");
    });
});

describe("section_title", () => {
    it("names the media and route section together", () => {
        expect(section_title("media", "en")).toBe("Media and Routes");
    });
});
