import preact from "@preact/preset-vite";
import { execFileSync } from "node:child_process";
import { defineConfig, loadEnv } from "vite";
import { resolve_mobile_environment } from "./src/lib/environment.ts";

export default defineConfig(({ mode }) => {
    const values = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
    const environment = resolve_mobile_environment({
        stage: values.VITE_APP_ENV,
        api_url: values.VITE_API_URL,
        site_url: values.VITE_SITE_URL,
        content_base_url: values.VITE_CONTENT_BASE_URL,
    });
    return {
        plugins: [
            preact(),
            {
                name: "app-build-manifest",
                generateBundle() {
                    this.emitFile({
                        type: "asset",
                        fileName: "app-build.json",
                        source: JSON.stringify({
                            ...environment,
                            source_revision: execFileSync(
                                "git",
                                ["rev-parse", "HEAD"],
                                { encoding: "utf8" },
                            ).trim(),
                            source_dirty: Boolean(
                                execFileSync("git", ["status", "--porcelain"], {
                                    encoding: "utf8",
                                }).trim(),
                            ),
                        }),
                    });
                },
            },
        ],
        server: {
            host: "127.0.0.1",
            port: 4173,
        },
    };
});
