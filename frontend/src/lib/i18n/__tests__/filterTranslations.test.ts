import { describe, expect, it } from "vitest";

import {
    getFilterSectionLabel,
    getFilterUiLabel,
} from "../filterTranslations";

describe("filter UI translations", () => {
    it("localizes shared actions in every supported locale", () => {
        expect(getFilterUiLabel("close", "zh")).toBe("关闭");
        expect(getFilterUiLabel("close", "de")).toBe("Schließen");
        expect(getFilterUiLabel("close", "en")).toBe("Close");
    });

    it("localizes route filter sections", () => {
        expect(getFilterSectionLabel("region", "Region", "zh")).toBe("区域");
        expect(getFilterSectionLabel("difficulty", "Difficulty", "de")).toBe(
            "Schwierigkeit",
        );
        expect(getFilterSectionLabel("distance", "Distance", "en")).toBe(
            "Distance",
        );
    });

    it("preserves an unknown section label", () => {
        expect(getFilterSectionLabel("unknown", "Custom", "zh")).toBe(
            "Custom",
        );
    });
});
