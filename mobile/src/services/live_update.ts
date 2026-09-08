import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

import { APP_CONFIG } from "../config";
import { parse_live_update_manifest } from "../lib/live_update";

export type LiveUpdateCheckStatus =
    "current" | "downloaded" | "pending" | "skipped" | "unavailable";

export interface LiveUpdateCheckResult {
    bundle_id?: string;
    status: LiveUpdateCheckStatus;
}

let active_check: Promise<LiveUpdateCheckResult> | undefined;

function cache_busted_url(url: string): string {
    const parsed_url = new URL(url);
    parsed_url.searchParams.set("checked_at", String(Date.now()));
    return parsed_url.toString();
}

async function perform_live_update_check(): Promise<LiveUpdateCheckResult> {
    try {
        const version = await LiveUpdate.getVersionCode();
        if (version.versionCode !== APP_CONFIG.live_update.native_version_code) {
            return { status: "skipped" };
        }

        const response = await CapacitorHttp.get({
            connectTimeout: 15_000,
            headers: {
                Accept: "application/json",
            },
            readTimeout: 15_000,
            responseType: "json",
            url: cache_busted_url(APP_CONFIG.live_update.manifest_url),
        });
        if (response.status < 200 || response.status >= 300) {
            return { status: "unavailable" };
        }

        const manifest = parse_live_update_manifest(
            response.data,
            version.versionCode,
            APP_CONFIG.live_update.asset_base_url,
        );
        const [current, next, downloaded, blocked] = await Promise.all([
            LiveUpdate.getCurrentBundle(),
            LiveUpdate.getNextBundle(),
            LiveUpdate.getDownloadedBundles(),
            LiveUpdate.getBlockedBundles(),
        ]);

        if (current.bundleId === manifest.bundle_id) {
            return { bundle_id: manifest.bundle_id, status: "current" };
        }
        if (next.bundleId === manifest.bundle_id) {
            return { bundle_id: manifest.bundle_id, status: "pending" };
        }
        if (blocked.bundleIds.includes(manifest.bundle_id)) {
            return { status: "skipped" };
        }

        if (!downloaded.bundleIds.includes(manifest.bundle_id)) {
            await LiveUpdate.downloadBundle({
                artifactType: "zip",
                bundleId: manifest.bundle_id,
                checksum: manifest.checksum,
                signature: manifest.signature,
                url: cache_busted_url(manifest.bundle_url),
            });
        }
        await LiveUpdate.setNextBundle({ bundleId: manifest.bundle_id });
        return { bundle_id: manifest.bundle_id, status: "downloaded" };
    } catch (error) {
        console.warn("Live update check failed; keeping the current bundle.", error);
        return { status: "unavailable" };
    }
}

export async function mark_live_update_ready(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        return;
    }
    try {
        await LiveUpdate.ready();
    } catch (error) {
        console.warn("Unable to mark the live update bundle as ready.", error);
    }
}

export function check_for_live_update(): Promise<LiveUpdateCheckResult> {
    if (!Capacitor.isNativePlatform()) {
        return Promise.resolve({ status: "skipped" });
    }
    if (active_check) {
        return active_check;
    }

    active_check = perform_live_update_check().finally(() => {
        active_check = undefined;
    });
    return active_check;
}

export async function initialize_live_updates(): Promise<void> {
    await mark_live_update_ready();
    await check_for_live_update();
}
