import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
    // Navigation links are only directly visible on desktop
    test.use({ viewport: { width: 1280, height: 720 } });

    test('header nav links navigate correctly', async ({ page }) => {
        await page.goto('/zh/');

        await page.click('nav a:has-text("车影骑踪")');
        await expect(page).toHaveURL('/zh/media');

        await page.click('nav a:has-text("器械知识")');
        await expect(page).toHaveURL('/zh/knowledge/gear');

        await page.click('nav a:has-text("科学训练")');
        await expect(page).toHaveURL('/zh/knowledge/training');

        await page.click('nav a:has-text("骑行路线")');
        await expect(page).toHaveURL('/zh/routes');
    });

    test('logo links to homepage', async ({ page }) => {
        await page.goto('/zh/media');
        await page.click('.logo');
        await expect(page).toHaveURL('/zh/');
    });

    /*
    test('active nav item is highlighted on media page', async ({ page }) => {
        await page.goto('/zh/media');
        // 使用更精确的选择器，并等待
        const activeLink = page.locator('nav a.active');
        await expect(activeLink).toBeVisible();
        await expect(activeLink).toContainText('车影骑踪');
    });

    test('active nav item is highlighted on gear page', async ({ page }) => {
        await page.goto('/zh/knowledge/gear');
        const activeLink = page.locator('nav a.active');
        await expect(activeLink).toBeVisible();
        await expect(activeLink).toContainText('器械知识');
    });
    */

    test('hub cards on homepage are clickable', async ({ page }) => {
        await page.goto('/zh/');

        await page.click('.hub-card:has-text("车影骑踪")');
        await expect(page).toHaveURL('/zh/media');
    });
});
