import { describe, expect, it } from "vitest";

import { parse_content_deep_link } from "./native";

describe("parse_content_deep_link", () => {
    it("maps website event URLs", () => {
        expect(
            parse_content_deep_link("https://www.across-cc.de/en/events/evening-ride"),
        ).toEqual({
            locale: "en",
            slug: "evening-ride",
            type: "event",
        });
    });

    it("maps knowledge URLs", () => {
        expect(
            parse_content_deep_link(
                "https://www.across-cc.de/de/knowledge/training/cadence",
            ),
        ).toEqual({ locale: "de", slug: "cadence", type: "training" });
    });

    it("rejects lookalike domains", () => {
        expect(
            parse_content_deep_link("https://not-across-cc.de/en/events/ride"),
        ).toBeUndefined();
    });
});
