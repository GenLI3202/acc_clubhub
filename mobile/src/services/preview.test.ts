import { afterEach, describe, expect, it, vi } from "vitest";

import type { MobileContentItem } from "../../../shared/mobile_content";

vi.mock("../config", () => ({
    APP_CONFIG: {
        api_url: "https://acc-clubhub-events-ms.vercel.app",
        stage: "preview",
    },
}));

import { submit_registration, submit_subscription } from "./api";
import { login_admin, logout_admin, notify_admin_event } from "./admin";

const item = {
    slug: "ride",
} as MobileContentItem;

afterEach(() => vi.unstubAllGlobals());

describe("read-only preview", () => {
    it("blocks rider writes before reaching the production API", async () => {
        const fetch_mock = vi.fn();
        vi.stubGlobal("fetch", fetch_mock);

        await expect(
            submit_registration(item, "en", {
                email: "rider@example.test",
                insurance_accepted: true,
                name: "Rider",
                notes: "",
                privacy_accepted: true,
                subscribe: false,
            }),
        ).rejects.toThrow("disabled");
        await expect(
            submit_subscription("en", "Rider", "rider@example.test"),
        ).rejects.toThrow("disabled");
        expect(fetch_mock).not.toHaveBeenCalled();
    });

    it("blocks administrator writes and login before reaching the API", async () => {
        const fetch_mock = vi.fn();
        vi.stubGlobal("fetch", fetch_mock);

        await expect(login_admin("leader@example.test", "secret")).rejects.toThrow(
            "disabled",
        );
        await expect(notify_admin_event(1)).rejects.toThrow("disabled");
        await logout_admin();
        expect(fetch_mock).not.toHaveBeenCalled();
    });
});
