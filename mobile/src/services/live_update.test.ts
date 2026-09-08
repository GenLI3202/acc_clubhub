import { beforeEach, describe, expect, it, vi } from "vitest";

const native_mocks = vi.hoisted(() => ({
    blocked: vi.fn(),
    current: vi.fn(),
    download: vi.fn(),
    downloaded: vi.fn(),
    http_get: vi.fn(),
    is_native: vi.fn(),
    next: vi.fn(),
    ready: vi.fn(),
    set_next: vi.fn(),
    version: vi.fn(),
}));

vi.mock("@capawesome/capacitor-live-update", () => ({
    LiveUpdate: {
        downloadBundle: native_mocks.download,
        getBlockedBundles: native_mocks.blocked,
        getCurrentBundle: native_mocks.current,
        getDownloadedBundles: native_mocks.downloaded,
        getNextBundle: native_mocks.next,
        getVersionCode: native_mocks.version,
        ready: native_mocks.ready,
        setNextBundle: native_mocks.set_next,
    },
}));

vi.mock("@capacitor/core", () => ({
    Capacitor: {
        isNativePlatform: native_mocks.is_native,
    },
    CapacitorHttp: {
        get: native_mocks.http_get,
    },
}));

import { check_for_live_update, mark_live_update_ready } from "./live_update";

const BUNDLE_ID = `git-${"a".repeat(40)}`;
const BUNDLE_URL =
    "https://github.com/GenLI3202/acc_clubhub/releases/download/" +
    `mobile-live-production/acc-mobile-${"a".repeat(40)}.zip`;

beforeEach(() => {
    vi.clearAllMocks();
    native_mocks.is_native.mockReturnValue(true);
    native_mocks.version.mockResolvedValue({ versionCode: "2" });
    native_mocks.current.mockResolvedValue({ bundleId: null });
    native_mocks.next.mockResolvedValue({ bundleId: null });
    native_mocks.downloaded.mockResolvedValue({ bundleIds: [] });
    native_mocks.blocked.mockResolvedValue({ bundleIds: [] });
    native_mocks.download.mockResolvedValue(undefined);
    native_mocks.set_next.mockResolvedValue(undefined);
    native_mocks.ready.mockResolvedValue({});
    native_mocks.http_get.mockResolvedValue({
        data: {
            schema_version: 1,
            bundle_id: BUNDLE_ID,
            bundle_url: BUNDLE_URL,
            checksum: "b".repeat(64),
            signature: "c2lnbmF0dXJl",
            native_version_code: "2",
            published_at: "2026-09-08T12:00:00.000Z",
        },
        headers: {},
        status: 200,
        url: "",
    });
});

describe("mark_live_update_ready", () => {
    it("marks a native bundle ready for rollback protection", async () => {
        await mark_live_update_ready();

        expect(native_mocks.ready).toHaveBeenCalledOnce();
    });
});

describe("check_for_live_update", () => {
    it("downloads a signed update and activates it on the next launch", async () => {
        const result = await check_for_live_update();

        expect(result).toEqual({ bundle_id: BUNDLE_ID, status: "downloaded" });
        expect(native_mocks.download).toHaveBeenCalledWith(
            expect.objectContaining({
                artifactType: "zip",
                bundleId: BUNDLE_ID,
                checksum: "b".repeat(64),
                signature: "c2lnbmF0dXJl",
            }),
        );
        expect(native_mocks.set_next).toHaveBeenCalledWith({
            bundleId: BUNDLE_ID,
        });
    });

    it("does not download the bundle that is already active", async () => {
        native_mocks.current.mockResolvedValue({ bundleId: BUNDLE_ID });

        const result = await check_for_live_update();

        expect(result).toEqual({ bundle_id: BUNDLE_ID, status: "current" });
        expect(native_mocks.download).not.toHaveBeenCalled();
        expect(native_mocks.set_next).not.toHaveBeenCalled();
    });

    it("keeps the current bundle when the manifest is unavailable", async () => {
        native_mocks.http_get.mockResolvedValue({
            data: "not found",
            headers: {},
            status: 404,
            url: "",
        });

        await expect(check_for_live_update()).resolves.toEqual({
            status: "unavailable",
        });
        expect(native_mocks.download).not.toHaveBeenCalled();
    });
});
