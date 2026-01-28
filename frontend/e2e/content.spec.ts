import { test, expect } from '@playwright/test';

test.describe('Content Pages', () => {
    test('media list shows header and content cards', async ({ page }) => {
        await page.goto('/zh/media');
        await expect(page.locator('h1')).toContainText('车影骑踪');
        await expect(page.locator('.content-card')).toHaveCount(1);
    });

    test('media detail renders markdown content', async ({ page }) => {
        await page.goto('/zh/media/alps-summer-2025');
        await expect(page.locator('h1')).toContainText('阿尔卑斯夏日骑行记');
        // 验证 markdown 渲染
        await expect(page.locator('.article-content h2').first()).toBeVisible();
    });

    test('media detail has back link', async ({ page }) => {
        await page.goto('/zh/media/alps-summer-2025');
        await expect(page.locator('.article-back')).toBeVisible();
    });

    test('back link navigates to list', async ({ page }) => {
        await page.goto('/zh/media/alps-summer-2025');
        await page.click('.article-back');
        await expect(page).toHaveURL('/zh/media');
    });

    test('gear list page loads', async ({ page }) => {
        await page.goto('/zh/knowledge/gear');
        await expect(page.locator('h1')).toContainText('器械知识');
        await expect(page.locator('.content-card')).toHaveCount(1);
    });

    test('gear detail page loads', async ({ page }) => {
        await page.goto('/zh/knowledge/gear/road-bike-buying-guide');
        await expect(page.locator('h1')).toContainText('公路车购买指南');
    });

    test('training list page loads', async ({ page }) => {
        await page.goto('/zh/knowledge/training');
        await expect(page.locator('h1')).toContainText('科学训练');
        await expect(page.locator('.content-card')).toHaveCount(1);
    });

    test('training detail page loads', async ({ page }) => {
        await page.goto('/zh/knowledge/training/ftp-training-basics');
        await expect(page.locator('h1')).toContainText('FTP训练入门');
    });

    test('routes list shows stats in cards', async ({ page }) => {
        await page.goto('/zh/routes');
        await expect(page.locator('h1')).toContainText('骑行路线');
        await expect(page.locator('.content-card')).toHaveCount(1);
    });

    test('route detail has Strava/Komoot links', async ({ page }) => {
        await page.goto('/zh/routes/isar-valley-loop');
        await expect(page.locator('.route-link--strava')).toBeVisible();
        await expect(page.locator('.route-link--komoot')).toBeVisible();
    });

    test('route detail shows statistics', async ({ page }) => {
        await page.goto('/zh/routes/isar-valley-loop');
        await expect(page.locator('.stat-value')).toHaveCount(3);
    });

    test('about page loads', async ({ page }) => {
        await page.goto('/zh/about');
        await expect(page.locator('h1')).toContainText('关于');
    });

    test('events page loads', async ({ page }) => {
        await page.goto('/zh/events');
        await expect(page.locator('h1')).toContainText('慕城日常');
    });
});
