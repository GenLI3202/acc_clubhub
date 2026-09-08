import { describe, expect, it } from "vitest";

import type { MobileContentItem } from "../../../../shared/mobile_content";
import {
    create_mobile_content_feed,
    normalize_public_url,
    sanitize_mobile_markdown,
} from "./feed";

function create_item(id: string): MobileContentItem {
    return {
        body_html: "<p>Body</p>",
        description: "Description",
        featured: false,
        id,
        links: [],
        locale: "en",
        metadata: {},
        slug: id,
        title: id,
        type: "event",
    };
}

describe("sanitize_mobile_markdown", () => {
    it("removes executable markup and embedded frames", () => {
        const result = sanitize_mobile_markdown(
            '[Unsafe](javascript:alert(1))<script>alert(1)</script>' +
                '<iframe src="https://www.komoot.com/tour/1"></iframe>',
        );

        expect(result).not.toContain("javascript:");
        expect(result).not.toContain("script");
        expect(result).not.toContain("iframe");
        expect(result).toContain("noopener noreferrer");
    });

    it("turns site-relative images into absolute HTTPS URLs", () => {
        const result = sanitize_mobile_markdown(
            "![Ride](/images/events/ride.jpg)",
        );

        expect(result).toContain(
            'src="https://www.across-cc.de/images/events/ride.jpg"',
        );
        expect(result).toContain('loading="lazy"');
    });
});

describe("create_mobile_content_feed", () => {
    it("sorts items and creates a stable content revision", () => {
        const generated_at = "2026-09-08T10:00:00.000Z";
        const first = create_mobile_content_feed(
            "en",
            [create_item("event:z"), create_item("event:a")],
            generated_at,
        );
        const second = create_mobile_content_feed(
            "en",
            [create_item("event:a"), create_item("event:z")],
            "2026-09-09T10:00:00.000Z",
        );

        expect(first.items.map((item) => item.id)).toEqual([
            "event:a",
            "event:z",
        ]);
        expect(first.content_revision).toBe(second.content_revision);
    });

    it("rejects duplicate ids", () => {
        expect(() =>
            create_mobile_content_feed("en", [
                create_item("event:a"),
                create_item("event:a"),
            ]),
        ).toThrow("Duplicate mobile content id");
    });
});

describe("normalize_public_url", () => {
    it("rejects non-public schemes", () => {
        expect(normalize_public_url("javascript:alert(1)"))
            .toBeUndefined();
    });
});
