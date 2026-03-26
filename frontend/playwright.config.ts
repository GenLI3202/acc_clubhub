import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    retries: process.env.CI ? 2 : 1,
    reporter: process.env.CI ? 'html' : 'list',
    use: {
        baseURL: 'http://localhost:4321',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'npm run preview',
        port: 4321,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
    projects: [
        {
            name: 'desktop',
            use: { viewport: { width: 1280, height: 720 } },
        },
        {
            name: 'mobile',
            use: { viewport: { width: 375, height: 667 } },
        },
    ],
});
