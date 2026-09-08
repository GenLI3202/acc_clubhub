import { describe, expect, it } from "vitest";

import {
    parse_live_update_manifest,
    release_asset_base_url,
    release_manifest_url,
} from "./live_update";

const ASSET_BASE_URL = release_asset_base_url(
    "GenLI3202/acc_clubhub",
    "mobile-live-production",
);

function valid_manifest(): Record<string, unknown> {
    return {
        schema_version: 1,
        bundle_id: "git-a1b2c3d4e5f6",
        bundle_url: `${ASSET_BASE_URL}acc-mobile-a1b2c3d4e5f6.zip`,
        checksum: "a".repeat(64),
        signature: "c2lnbmF0dXJl",
        native_version_code: "2",
        published_at: "2026-09-08T12:00:00.000Z",
    };
}

describe("parse_live_update_manifest", () => {
    it("accepts a compatible manifest from the trusted release", () => {
        expect(
            parse_live_update_manifest(valid_manifest(), "2", ASSET_BASE_URL),
        ).toEqual(valid_manifest());
    });

    it("accepts a JSON response body", () => {
        expect(
            parse_live_update_manifest(
                JSON.stringify(valid_manifest()),
                "2",
                ASSET_BASE_URL,
            ).bundle_id,
        ).toBe("git-a1b2c3d4e5f6");
    });

    it("rejects an update for another native version", () => {
        expect(() =>
            parse_live_update_manifest(valid_manifest(), "3", ASSET_BASE_URL),
        ).toThrow("not compatible");
    });

    it("rejects a bundle hosted outside the configured release", () => {
        const manifest = valid_manifest();
        manifest.bundle_url = "https://example.com/acc-mobile.zip";

        expect(() => parse_live_update_manifest(manifest, "2", ASSET_BASE_URL)).toThrow(
            "not trusted",
        );
    });

    it("rejects a malformed checksum", () => {
        const manifest = valid_manifest();
        manifest.checksum = "not-a-sha256";

        expect(() => parse_live_update_manifest(manifest, "2", ASSET_BASE_URL)).toThrow(
            "checksum",
        );
    });
});

describe("release_manifest_url", () => {
    it("builds the stable production manifest URL", () => {
        expect(
            release_manifest_url(
                "GenLI3202/acc_clubhub",
                "mobile-live-production",
                "latest.json",
            ),
        ).toBe(`${ASSET_BASE_URL}latest.json`);
    });
});
