import type { CapacitorConfig } from "@capacitor/cli";

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
};

export default config;
