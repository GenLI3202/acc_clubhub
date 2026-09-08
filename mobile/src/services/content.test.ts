import { afterEach, describe, expect, it, vi } from "vitest";

import type { MobileContentFeed, MobileLocale } from "../../../shared/mobile_content";
import { ContentUpdateRequiredError, load_content_feed } from "./content";

function create_feed(
    locale: MobileLocale = "zh",
    minimum_app_version = "0.1.0",
): MobileContentFeed {
    return {
        content_revision: "sha256:test",
        generated_at: "2026-09-08T12:00:00.000Z",
        items: [],
        locale,
        minimum_app_version,
        schema_version: 1,
    };
}

function create_response(feed: MobileContentFeed): Response {
    return new Response(JSON.stringify(feed), {
        headers: { "Content-Type": "application/json" },
        status: 200,
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("load_content_feed", () => {
    it("loads current content directly from the public feed", async () => {
        const feed = create_feed();
        const fetch_mock = vi.fn().mockResolvedValue(create_response(feed));
        vi.stubGlobal("fetch", fetch_mock);

        const result = await load_content_feed("zh");

        expect(result).toEqual({ feed, source: "network" });
        expect(fetch_mock).toHaveBeenCalledWith(
            "https://www.across-cc.de/mobile-content/v1/zh.json",
            expect.objectContaining({ cache: "no-store" }),
        );
    });

    it("uses the last known feed when the network is unavailable", async () => {
        const feed = create_feed("en");
        const match = vi.fn().mockResolvedValue(create_response(feed));
        vi.stubGlobal("caches", {
            open: vi.fn().mockResolvedValue({ match, put: vi.fn() }),
        });
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

        const result = await load_content_feed("en");

        expect(result).toEqual({ feed, source: "cache" });
        expect(match).toHaveBeenCalledWith(
            "https://www.across-cc.de/mobile-content/v1/en.json",
        );
    });

    it("uses bundled content before the first successful sync", async () => {
        const feed = create_feed("de");
        const fetch_mock = vi
            .fn()
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValueOnce(create_response(feed));
        vi.stubGlobal("fetch", fetch_mock);

        const result = await load_content_feed("de");

        expect(result).toEqual({ feed, source: "bundled" });
        expect(fetch_mock).toHaveBeenNthCalledWith(2, "/mobile-content/v1/de.json");
    });

    it("requires an app update before accepting incompatible content", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(create_response(create_feed("zh", "0.3.0"))),
        );

        await expect(load_content_feed("zh")).rejects.toBeInstanceOf(
            ContentUpdateRequiredError,
        );
    });
});
