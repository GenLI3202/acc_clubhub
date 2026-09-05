import { describe, expect, it } from "vitest";
import { departure_clock, departure_day, format_departure } from "../event_schedule";

describe("Munich departure formatting", () => {
    it("prefills the Munich calendar date across UTC day and year boundaries", () => {
        expect(departure_day("2030-07-06T22:30:00Z")).toBe("2030-07-07");
        expect(departure_day("2030-12-31T23:30:00Z")).toBe("2031-01-01");
    });
    it("converts UTC to the same rider-facing clock time in summer and winter", () => {
        expect(departure_clock("2030-07-06T07:30:00Z")).toBe("09:30");
        expect(departure_clock("2030-01-12T08:30:00Z")).toBe("09:30");
        expect(format_departure("2030-07-06T07:30:00Z", "zh"))
            .toContain("09:30");
        expect(format_departure("2030-01-12T08:30:00Z", "de"))
            .toContain("09:30");
    });
});
