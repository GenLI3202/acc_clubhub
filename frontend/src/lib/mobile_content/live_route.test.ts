import type { APIContext } from "astro";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./build_items", () => ({
  build_mobile_items: vi
    .fn()
    .mockRejectedValue(new Error("Unavailable runtime")),
}));
import { GET } from "../../pages/mobile-content/live/v1/[lang].json";

afterEach(() => vi.unstubAllGlobals());

describe("live feed availability", () => {
  it("keeps the published 0.2 content channel available after a live failure", async () => {
    const snapshot = { schema_version: 1, locale: "zh", items: [] };
    const fetch_mock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(snapshot)));
    vi.stubGlobal("fetch", fetch_mock);
    const response = await GET({ params: { lang: "zh" } } as APIContext);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Mobile-Content-Source")).toBe(
      "published-snapshot",
    );
    expect(await response.json()).toEqual(snapshot);
    expect(String(fetch_mock.mock.calls[0]?.[0])).toBe(
      "https://www.across-cc.de/mobile-content/v1/zh.json",
    );
  });

  it("returns unavailable when both content channels fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    const response = await GET({ params: { lang: "en" } } as APIContext);
    expect(response.status).toBe(503);
  });

  it("rejects unsupported languages without requesting a snapshot", async () => {
    const fetch_mock = vi.fn();
    vi.stubGlobal("fetch", fetch_mock);
    const response = await GET({ params: { lang: "invalid" } } as APIContext);
    expect(response.status).toBe(400);
    expect(fetch_mock).not.toHaveBeenCalled();
  });
});
