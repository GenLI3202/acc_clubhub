import { describe, expect, it } from "vitest";

import { format_route_distance } from "../route_metrics";

describe("format_route_distance", () => {
    it("formats exact distances with the active locale unit", () => {
        expect(format_route_distance(58, undefined, "zh")).toBe("58 公里");
        expect(format_route_distance(58, undefined, "en")).toBe("58 km");
        expect(format_route_distance(58, undefined, "de")).toBe("58 km");
    });

    it("preserves a source-reported range", () => {
        expect(format_route_distance(30, [20, 30], "zh")).toBe("20–30 公里");
        expect(format_route_distance(30, [20, 30], "en")).toBe("20–30 km");
    });
});
