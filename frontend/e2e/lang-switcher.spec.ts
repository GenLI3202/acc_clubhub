import { test, expect } from '@playwright/test';

// Desktop viewport — lang switcher is visible
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Language Switcher', () => {
    test('opens on pages WITHOUT client:load components (homepage)', async ({ page }) => {
        await page.goto('/zh/');
        await page.waitForLoadState('networkidle');

        const dropdown = page.locator('.lang-dropdown');
        const toggle = page.locator('.lang-toggle');

        await expect(dropdown).not.toHaveClass(/open/);
        await toggle.click();
        await expect(dropdown).toHaveClass(/open/);
    });

    test('opens on /zh/knowledge/gear (has client:load Preact component)', async ({ page }) => {
        await page.goto('/zh/knowledge/gear');
        await page.waitForLoadState('networkidle');

        const dropdown = page.locator('.lang-dropdown');
        const toggle = page.locator('.lang-toggle');

        await expect(dropdown).not.toHaveClass(/open/);
        await toggle.click();
        // Bug: dropdown opens then immediately closes — this assertion fails before the fix
        await expect(dropdown).toHaveClass(/open/);
    });

    test('opens on /zh/knowledge/training (has client:load Preact component)', async ({ page }) => {
        await page.goto('/zh/knowledge/training');
        await page.waitForLoadState('networkidle');

        const dropdown = page.locator('.lang-dropdown');
        const toggle = page.locator('.lang-toggle');

        await expect(dropdown).not.toHaveClass(/open/);
        await toggle.click();
        await expect(dropdown).toHaveClass(/open/);
    });

    test('opens on /zh/routes (has client:load Preact component)', async ({ page }) => {
        await page.goto('/zh/routes');
        await page.waitForLoadState('networkidle');

        const dropdown = page.locator('.lang-dropdown');
        const toggle = page.locator('.lang-toggle');

        await expect(dropdown).not.toHaveClass(/open/);
        await toggle.click();
        await expect(dropdown).toHaveClass(/open/);
    });

    test('opens on /zh/media (has client:load Preact component)', async ({ page }) => {
        await page.goto('/zh/media');
        await page.waitForLoadState('networkidle');

        const dropdown = page.locator('.lang-dropdown');
        const toggle = page.locator('.lang-toggle');

        await expect(dropdown).not.toHaveClass(/open/);
        await toggle.click();
        await expect(dropdown).toHaveClass(/open/);
    });

    test('closes when clicking outside', async ({ page }) => {
        await page.goto('/zh/knowledge/gear');
        await page.waitForLoadState('networkidle');

        const dropdown = page.locator('.lang-dropdown');
        const toggle = page.locator('.lang-toggle');

        await toggle.click();
        await expect(dropdown).toHaveClass(/open/);

        // Click somewhere outside the dropdown
        await page.locator('h1').first().click();
        await expect(dropdown).not.toHaveClass(/open/);
    });

    test('second click closes the dropdown', async ({ page }) => {
        await page.goto('/zh/knowledge/gear');
        await page.waitForLoadState('networkidle');

        const dropdown = page.locator('.lang-dropdown');
        const toggle = page.locator('.lang-toggle');

        await toggle.click();
        await expect(dropdown).toHaveClass(/open/);

        await toggle.click();
        await expect(dropdown).not.toHaveClass(/open/);
    });
});
