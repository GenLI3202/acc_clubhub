import { describe, expect, it } from "vitest";

import type { MobileContentItem } from "../../../shared/mobile_content";
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
        expect(hero.action_label).toBe("Register");
        expect(hero.meta).toContain("München");
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
