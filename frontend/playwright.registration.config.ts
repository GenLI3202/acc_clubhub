import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    testMatch: ["registration_cancellation.spec.ts", "registration_timezone.spec.ts"],
    workers: 1,
    retries: 0,
    use: { baseURL: "http://localhost:4497", screenshot: "only-on-failure" },
    webServer: [
        {
            command: "../backend/.venv/bin/python "
                + "../backend/tests/fixtures/registration_server.py",
            url: "http://127.0.0.1:8011/docs",
            reuseExistingServer: false,
        },
        {
            command: "npm run dev -- --port 4497",
            url: "http://localhost:4497",
            env: { PUBLIC_API_URL: "http://127.0.0.1:8011", TZ: "UTC" },
            reuseExistingServer: false,
        },
    ],
    projects: [
        { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
        { name: "mobile", use: { viewport: { width: 375, height: 812 } } },
    ],
});
