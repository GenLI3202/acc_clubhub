import { test, expect } from '@playwright/test';

test.describe('Content Pages', () => {
    test('media list shows header and content cards', async ({ page }) => {
        await page.goto('/zh/media');
        await expect(page.getByRole('heading', { name: '车影骑踪' })).toBeVisible();
        await expect(
            page.getByRole('link', { name: /2026 ACC 开春首骑/ }).first(),
        ).toBeVisible();
    });

    test('media detail renders markdown content', async ({ page }) => {
        await page.goto('/zh/media/2026-season-opening-recap');
        await expect(
            page.getByRole('heading', { name: /2026 ACC 开春首骑/ }),
        ).toBeVisible();
        // 验证 markdown 渲染
        await expect(page.locator('.article-content h2').first()).toBeVisible();
    });

    test('media detail has back link', async ({ page }) => {
        await page.goto('/zh/media/2026-season-opening-recap');
        await expect(page.locator('.article-back')).toBeVisible();
    });

    test('back link navigates to list', async ({ page }) => {
        await page.goto('/zh/media/2026-season-opening-recap');
        await page.click('.article-back');
        await expect(page).toHaveURL('/zh/media');
    });

    test('gear list page loads', async ({ page }) => {
        await page.goto('/zh/knowledge/gear');
        await expect(page.getByRole('heading', { name: '器械知识' })).toBeVisible();
        await expect(page.getByText('没有找到匹配的内容')).toBeVisible();
    });

    test('removed placeholder gear detail is not generated', async ({ page }) => {
        const response = await page.goto('/zh/knowledge/gear/road-bike-buying-guide');
        expect(response?.status()).toBe(404);
    });

    test('training list page loads', async ({ page }) => {
        await page.goto('/zh/knowledge/training');
        await expect(page.getByRole('heading', { name: '科学训练' })).toBeVisible();
        // Training content may be empty, just verify page loads
    });

    // Skip training detail test - no training content exists yet
    test.skip('training detail page loads', async ({ page }) => {
        await page.goto('/zh/knowledge/training/ftp-training-basics');
        await expect(page.locator('h1')).toContainText('FTP训练入门');
    });

    test('routes list does not show removed placeholder routes', async ({ page }) => {
        await page.goto('/zh/routes');
        await expect(
            page.getByRole('heading', { name: '骑行路线', exact: true }),
        ).toBeVisible();
        await expect(page.getByText('(Fake Template)')).toHaveCount(0);
    });

    test('removed placeholder route detail is not generated', async ({ page }) => {
        const response = await page.goto('/zh/routes/isar-valley-loop');
        expect(response?.status()).toBe(404);
    });

    test('about page loads', async ({ page }) => {
        await page.goto('/zh/about');
        await expect(
            page.getByRole('heading', { name: 'Across Cycling Club' }),
        ).toBeVisible();
    });

    test('events page loads', async ({ page }) => {
        await page.goto('/zh/events');
        await expect(page.getByRole('heading', { name: '即将到来' })).toBeVisible();
    });
});
