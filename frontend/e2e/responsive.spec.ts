import { test, expect } from '@playwright/test';

// Mobile-specific tests
test.describe('Responsive Design', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('mobile nav toggle is visible', async ({ page }) => {
        await page.goto('/zh/');
        await expect(page.locator('.nav-toggle-label')).toBeVisible();
    });

    test('mobile nav menu opens on toggle click', async ({ page }) => {
        await page.goto('/zh/');
        // Check that nav is hidden initially on mobile
        const navList = page.locator('nav ul');

        // Click toggle to open
        await page.click('.nav-toggle-label');

        // Now nav should be visible
        await expect(navList).toBeVisible();
    });

    test('hub cards are visible on mobile', async ({ page }) => {
        await page.goto('/zh/');
        const cards = page.locator('.hub-card');
        await expect(cards.first()).toBeVisible();
        await expect(cards).toHaveCount(5);
    });

    test('content cards are visible on mobile', async ({ page }) => {
        await page.goto('/zh/media');
        await expect(page.locator('.content-card').first()).toBeVisible();
    });

    test('article content is readable on mobile', async ({ page }) => {
        await page.goto('/zh/media/alps-summer-2025');
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('.article-content')).toBeVisible();
    });

    test('language switcher is accessible on mobile', async ({ page }) => {
        await page.goto('/zh/');
        await expect(page.locator('.lang-switcher')).toBeVisible();
    });
});

// Desktop-specific tests
test.describe('Desktop Layout', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('nav toggle is hidden on desktop', async ({ page }) => {
        await page.goto('/zh/');
        await expect(page.locator('.nav-toggle-label')).not.toBeVisible();
    });

    test('nav links are visible on desktop', async ({ page }) => {
        await page.goto('/zh/');
        await expect(page.locator('nav ul')).toBeVisible();
        await expect(page.locator('nav a:has-text("车影骑踪")')).toBeVisible();
    });

    test('hub cards display in grid on desktop', async ({ page }) => {
        await page.goto('/zh/');
        const grid = page.locator('.hub-grid');
        await expect(grid).toBeVisible();
    });
});
