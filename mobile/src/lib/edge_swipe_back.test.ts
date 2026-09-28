import { describe, expect, it } from "vitest";

import { completes_edge_swipe, starts_edge_swipe } from "./edge_swipe_back";

describe("edge swipe back", () => {
    it("only starts at the left screen edge", () => {
        expect(starts_edge_swipe(18)).toBe(true);
        expect(starts_edge_swipe(48)).toBe(false);
    });

    it("requires a deliberate rightward gesture", () => {
        expect(completes_edge_swipe(90, 12)).toBe(true);
        expect(completes_edge_swipe(55, 2)).toBe(false);
        expect(completes_edge_swipe(90, 90)).toBe(false);
        expect(completes_edge_swipe(-90, 0)).toBe(false);
    });
});
