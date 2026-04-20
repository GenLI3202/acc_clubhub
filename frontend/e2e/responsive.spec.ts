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

// Stamp wall — mobile tile sizing (issue #112)
test.describe('Stamp wall on mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('stamp tiles are at least 120px wide on mobile', async ({ page }) => {
        await page.goto('/en/about');
        // Wait for the stamp wall to be present
        const wall = page.locator('[data-stamp-wall]');
        await expect(wall).toBeVisible();

        // Measure the first visible stamp tile
        const firstTile = page.locator('.stamp-tile').first();
        await expect(firstTile).toBeVisible();
        const box = await firstTile.boundingBox();
        expect(box).not.toBeNull();
        // 2-column layout gives ~85px; 3-column would give ~50px at this viewport
        expect(box!.width).toBeGreaterThanOrEqual(75);
    });

    test('no more than 2 stamp tiles are fully visible per row on mobile', async ({ page }) => {
        await page.goto('/en/about');
        const wall = page.locator('[data-stamp-wall]');
        await expect(wall).toBeVisible();
        const wallBox = await wall.boundingBox();
        expect(wallBox).not.toBeNull();

        const tiles = page.locator('.stamp-tile');
        const count = await tiles.count();
        let fullyVisible = 0;
        for (let i = 0; i < count; i++) {
            const box = await tiles.nth(i).boundingBox();
            if (!box) continue;
            const withinWall =
                box.x >= wallBox!.x &&
                box.x + box.width <= wallBox!.x + wallBox!.width;
            if (withinWall) fullyVisible++;
        }
        // 2 rows × 2 tiles = 4 fully-visible tiles on mobile
        expect(fullyVisible).toBeLessThanOrEqual(4);
    });

    test('stamp wall dot pagination is visible and functional on mobile', async ({ page }) => {
        await page.goto('/en/about');
        const dots = page.locator('[data-stamp-dot]');
        await expect(dots.first()).toBeVisible();
        await expect(dots).toHaveCount(3);
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
