import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CapacitorConfig } from "@capacitor/cli";

const live_update_public_key = readFileSync(
    resolve(process.cwd(), "live_update_public.pem"),
    "utf8",
).trim();

const config: CapacitorConfig = {
    appId: "de.acrosscc.clubhub",
    appName: "ACC ClubHub",
    webDir: "dist",
    android: {
        allowMixedContent: false,
    },
    ios: {
        contentInset: "automatic",
    },
    plugins: {
        LiveUpdate: {
            autoBlockRolledBackBundles: true,
            autoDeleteBundles: true,
            autoUpdateStrategy: "none",
            httpTimeout: 30_000,
            publicKey: live_update_public_key,
            readyTimeout: 10_000,
        },
    },
};

export default config;
