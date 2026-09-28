import { describe, expect, it } from "vitest";

import { resolve_mobile_environment } from "./environment";

describe("resolve_mobile_environment", () => {
    it("requires separate explicit endpoints for a staging build", () => {
        expect(() => resolve_mobile_environment({ stage: "staging" })).toThrow();
        expect(() =>
            resolve_mobile_environment({
                api_url: "https://acc-clubhub-events-ms.vercel.app/alternate-path",
                content_base_url:
                    "https://content.staging.example.org/mobile-content/v1",
                site_url: "https://www.staging.example.org",
                stage: "staging",
            }),
        ).toThrow("production");
    });

    it("keeps staging URLs out of the production live-update channel", () => {
        const result = resolve_mobile_environment({
            api_url: "https://api.staging.example.org",
            content_base_url: "https://www.staging.example.org/mobile-content/v1",
            site_url: "https://www.staging.example.org",
            stage: "staging",
        });
        expect(result.stage).toBe("staging");
        expect(result.api_url).toBe("https://api.staging.example.org");
    });
});
