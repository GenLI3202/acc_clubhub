import { afterEach, describe, expect, it, vi } from "vitest";

import type { MobileContentItem } from "../../../shared/mobile_content";
import { ApiError, IndeterminateRegistrationError, submit_registration } from "./api";

const item: MobileContentItem = {
    body_html: "",
    description: "",
    featured: false,
    id: "event:ride",
    links: [],
    locale: "en",
    metadata: { event_date: "2027-02-01T10:00:00Z" },
    slug: "ride",
    title: "Ride",
    type: "event",
};
const fields = {
    email: "rider@example.test",
    insurance_accepted: true,
    name: "Rider",
    notes: "",
    privacy_accepted: true,
    subscribe: false,
};

afterEach(() => vi.unstubAllGlobals());

describe("submit_registration", () => {
    it("reports an unknown outcome after a network failure without retrying", async () => {
        const fetch_mock = vi.fn().mockRejectedValue(new TypeError("Network failed"));
        vi.stubGlobal("fetch", fetch_mock);
        await expect(submit_registration(item, "en", fields)).rejects.toBeInstanceOf(
            IndeterminateRegistrationError,
        );
        expect(fetch_mock).toHaveBeenCalledTimes(1);
    });

    it("treats a server error as an unknown outcome", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
        );
        await expect(submit_registration(item, "en", fields)).rejects.toBeInstanceOf(
            IndeterminateRegistrationError,
        );
    });

    it("keeps a definite validation rejection separate", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response(null, { status: 400 })),
        );
        await expect(submit_registration(item, "en", fields)).rejects.toBeInstanceOf(
            ApiError,
        );
    });
});
