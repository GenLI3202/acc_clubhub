import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    enabled: true,
    get: vi.fn(),
    platform: vi.fn(),
    plugin: {
        getVersionCode: vi.fn(),
        getVersionName: vi.fn(),
        getCurrentBundle: vi.fn(),
        getNextBundle: vi.fn(),
        getDownloadedBundles: vi.fn(),
        getBlockedBundles: vi.fn(),
        downloadBundle: vi.fn(),
        setNextBundle: vi.fn(),
        reload: vi.fn(),
        ready: vi.fn(),
    },
}));
vi.mock("@capacitor/core", () => ({
    Capacitor: { getPlatform: mocks.platform },
    CapacitorHttp: { get: mocks.get },
}));
vi.mock("@capawesome/capacitor-live-update", () => ({ LiveUpdate: mocks.plugin }));
vi.mock("../config", () => ({
    APP_CONFIG: {
        live_update: {
            get enabled() {
                return mocks.enabled;
            },
            supported_native_version_codes: ["2", "3"],
            legacy_native_version_code: "2",
            manifest_url:
                "https://github.com/GenLI3202/acc_clubhub/releases/download/mobile-live-production/latest.json",
            asset_base_url:
                "https://github.com/GenLI3202/acc_clubhub/releases/download/mobile-live-production/",
        },
    },
}));

function manifest(native_version_code = "2"): object {
    return {
        schema_version: 1,
        bundle_id: "git-test",
        bundle_url:
            "https://github.com/GenLI3202/acc_clubhub/releases/download/mobile-live-production/test.zip",
        checksum: "a".repeat(64),
        signature: "c2lnbmF0dXJl",
        native_version_code,
        published_at: "2026-09-28T10:00:00Z",
    };
}

beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    mocks.enabled = true;
    mocks.platform.mockReturnValue("android");
    mocks.plugin.getVersionCode.mockResolvedValue({ versionCode: "2" });
    mocks.plugin.getCurrentBundle.mockResolvedValue({ bundleId: null });
    mocks.plugin.getNextBundle.mockResolvedValue({ bundleId: null });
    mocks.plugin.getDownloadedBundles.mockResolvedValue({ bundleIds: [] });
    mocks.plugin.getBlockedBundles.mockResolvedValue({ bundleIds: [] });
    mocks.get.mockResolvedValue({ status: 200, data: manifest() });
});

describe("Android live updates", () => {
    it("marks the loaded Android bundle ready before checking updates", async () => {
        const { initialize_live_updates } = await import("./live_update");
        await initialize_live_updates();
        expect(mocks.plugin.ready).toHaveBeenCalledOnce();
        expect(mocks.plugin.ready.mock.invocationCallOrder[0]).toBeLessThan(
            mocks.get.mock.invocationCallOrder[0]!,
        );
    });

    it.each(["ios", "web"])("does not mark a bundle ready on %s", async (platform) => {
        mocks.platform.mockReturnValue(platform);
        const { initialize_live_updates } = await import("./live_update");
        await initialize_live_updates();
        expect(mocks.plugin.ready).not.toHaveBeenCalled();
        expect(mocks.get).not.toHaveBeenCalled();
    });

    it.each(["current", "pending"])(
        "does not redownload a %s bundle",
        async (status) => {
            const target =
                status === "current"
                    ? mocks.plugin.getCurrentBundle
                    : mocks.plugin.getNextBundle;
            target.mockResolvedValue({ bundleId: "git-test" });
            const { check_for_live_update } = await import("./live_update");
            expect(await check_for_live_update()).toMatchObject({ status });
            expect(mocks.plugin.downloadBundle).not.toHaveBeenCalled();
            expect(mocks.plugin.setNextBundle).not.toHaveBeenCalled();
        },
    );

    it("keeps the installed bundle when the remote manifest is unavailable", async () => {
        mocks.get.mockResolvedValue({ status: 404, data: "not found" });
        const { check_for_live_update } = await import("./live_update");
        expect(await check_for_live_update()).toMatchObject({ status: "unavailable" });
        expect(mocks.plugin.downloadBundle).not.toHaveBeenCalled();
        expect(mocks.plugin.setNextBundle).not.toHaveBeenCalled();
    });

    it.each(["2", "3"])(
        "downloads and verifies the channel for native %s",
        async (code) => {
            mocks.plugin.getVersionCode.mockResolvedValue({ versionCode: code });
            mocks.get.mockResolvedValue({ status: 200, data: manifest(code) });
            const { check_for_live_update } = await import("./live_update");
            expect(await check_for_live_update()).toMatchObject({
                status: "downloaded",
            });
            const url = new URL(mocks.get.mock.calls[0]?.[0].url);
            expect(
                url.pathname.endsWith(
                    code === "2" ? "/latest.json" : "/latest-native-3.json",
                ),
            ).toBe(true);
            expect(mocks.plugin.downloadBundle).toHaveBeenCalledWith(
                expect.objectContaining({
                    checksum: "a".repeat(64),
                    signature: "c2lnbmF0dXJl",
                }),
            );
            expect(mocks.plugin.setNextBundle).toHaveBeenCalledWith({
                bundleId: "git-test",
            });
            expect(mocks.plugin.reload).not.toHaveBeenCalled();
        },
    );

    it("rejects an incompatible manifest before downloading", async () => {
        mocks.get.mockResolvedValue({ status: 200, data: manifest("3") });
        const { check_for_live_update } = await import("./live_update");
        expect(await check_for_live_update()).toMatchObject({ status: "unavailable" });
        expect(mocks.plugin.downloadBundle).not.toHaveBeenCalled();
    });

    it("does not select a bundle rejected by native signature verification", async () => {
        mocks.plugin.downloadBundle.mockRejectedValue(new Error("Invalid signature"));
        const { check_for_live_update } = await import("./live_update");
        expect(await check_for_live_update()).toMatchObject({ status: "unavailable" });
        expect(mocks.plugin.setNextBundle).not.toHaveBeenCalled();
    });

    it("blocks rollback bundles and unsupported native versions", async () => {
        mocks.plugin.getBlockedBundles.mockResolvedValue({ bundleIds: ["git-test"] });
        const { check_for_live_update } = await import("./live_update");
        expect(await check_for_live_update()).toMatchObject({ status: "skipped" });
        expect(mocks.plugin.downloadBundle).not.toHaveBeenCalled();
        mocks.plugin.getVersionCode.mockResolvedValue({ versionCode: "1" });
        mocks.get.mockClear();
        expect(await check_for_live_update()).toMatchObject({ status: "skipped" });
        expect(mocks.get).not.toHaveBeenCalled();
    });

    it("shares simultaneous checks and reports the downloaded update", async () => {
        const { check_for_live_update, subscribe_live_updates } =
            await import("./live_update");
        const listener = vi.fn();
        const unsubscribe = subscribe_live_updates(listener);
        await Promise.all([check_for_live_update(), check_for_live_update()]);
        expect(mocks.get).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenLastCalledWith({
            bundle_id: "git-test",
            status: "downloaded",
        });
        unsubscribe();
    });

    it("requires a pending bundle for explicit reload", async () => {
        const { apply_live_update } = await import("./live_update");
        await expect(apply_live_update()).rejects.toThrow("No downloaded update");
        expect(mocks.plugin.reload).not.toHaveBeenCalled();
        mocks.plugin.getNextBundle.mockResolvedValue({ bundleId: "git-test" });
        await apply_live_update();
        expect(mocks.plugin.reload).toHaveBeenCalledOnce();
    });

    it("keeps preview and iOS out of executable updates", async () => {
        const { check_for_live_update, apply_live_update } =
            await import("./live_update");
        mocks.enabled = false;
        expect(await check_for_live_update()).toMatchObject({ status: "skipped" });
        await expect(apply_live_update()).rejects.toThrow("unavailable");
        mocks.enabled = true;
        mocks.platform.mockReturnValue("ios");
        expect(await check_for_live_update()).toMatchObject({ status: "skipped" });
        expect(mocks.get).not.toHaveBeenCalled();
    });
});
