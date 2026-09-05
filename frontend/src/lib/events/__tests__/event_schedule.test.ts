import { describe, expect, it } from "vitest";
import { departure_clock, format_departure } from "../event_schedule";

describe("Munich departure formatting", () => {
    it("converts UTC to the same rider-facing clock time in summer and winter", () => {
        expect(departure_clock("2030-07-06T07:30:00Z")).toBe("09:30");
        expect(departure_clock("2030-01-12T08:30:00Z")).toBe("09:30");
        expect(format_departure("2030-07-06T07:30:00Z", "zh"))
            .toContain("09:30");
        expect(format_departure("2030-01-12T08:30:00Z", "de"))
            .toContain("09:30");
    });
});
