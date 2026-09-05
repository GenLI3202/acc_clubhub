import { describe, expect, it } from "vitest";
import { parse_event_datetime } from "../event_datetime";

describe("event content timestamps", () => {
    it.each([
        ["2026-09-06 09:30", "2026-09-06T07:30:00.000Z"],
        ["2026-01-06 09:30", "2026-01-06T08:30:00.000Z"],
        ["2026-09-06T09:30:00", "2026-09-06T07:30:00.000Z"],
        ["2026-09-06T09:30:00+02:00", "2026-09-06T07:30:00.000Z"],
        ["2026-09-06T07:30:00Z", "2026-09-06T07:30:00.000Z"],
        ["2026-09-06 00:30", "2026-09-05T22:30:00.000Z"],
    ])("normalizes %s without relying on the server timezone", (input, expected) => {
        expect(parse_event_datetime(input).toISOString()).toBe(expected);
    });

    it("preserves already parsed timestamps", () => {
        const instant = new Date("2026-09-06T07:30:00Z");
        expect(parse_event_datetime(instant).getTime()).toBe(instant.getTime());
    });

    it.each([
        "2026-03-29 02:30", "2026-10-25 02:30", "2026-02-30 09:30",
    ])("rejects ambiguous or invalid local time %s", (input) => {
        expect(() => parse_event_datetime(input)).toThrow();
    });
});
