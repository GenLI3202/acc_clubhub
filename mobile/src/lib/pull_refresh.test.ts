import { describe, expect, it } from "vitest";

import {
    calculate_pull_distance,
    PULL_REFRESH_THRESHOLD_PX,
    pull_should_refresh,
} from "./pull_refresh";

describe("calculate_pull_distance", () => {
    it("ignores upward and invalid movement", () => {
        expect(calculate_pull_distance(-20)).toBe(0);
        expect(calculate_pull_distance(Number.NaN)).toBe(0);
    });

    it("applies resistance and limits the visible pull", () => {
        expect(calculate_pull_distance(100)).toBe(45);
        expect(calculate_pull_distance(1_000)).toBe(112);
    });
});

describe("pull_should_refresh", () => {
    it("requires the release threshold", () => {
        expect(pull_should_refresh(PULL_REFRESH_THRESHOLD_PX - 1)).toBe(false);
        expect(pull_should_refresh(PULL_REFRESH_THRESHOLD_PX)).toBe(true);
    });
});
