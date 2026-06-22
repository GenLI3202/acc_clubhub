import { test, expect } from '@playwright/test';

test.describe('Routing & i18n', () => {
    test('/ redirects to a supported locale homepage', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/(zh|en|de)\/?$/);
    });

    test('homepage displays 5 pillar sections', async ({ page }) => {
        await page.goto('/zh/');
        await expect(page.locator('.pillar-section')).toHaveCount(5);
    });

    test('homepage has correct title', async ({ page }) => {
        await page.goto('/zh/');
        await expect(page).toHaveTitle(/ACC ClubHub/);
    });

    test('language switcher works zh -> en', async ({ page }) => {
        await page.goto('/zh/');
        await page.click('.lang-toggle');
        await page.locator('.lang-link:has-text("EN")').click();
        // URL may or may not have trailing slash
        await expect(page).toHaveURL(/\/en\/?$/);
        // Use header nav to avoid footer nav ambiguity
        await expect(page.locator('header nav')).toContainText('Home');
    });

    test('language switcher works en -> de', async ({ page }) => {
        await page.goto('/en/');
        await page.click('.lang-toggle');
        await page.locator('.lang-link:has-text("DE")').click();
        // URL may or may not have trailing slash
        await expect(page).toHaveURL(/\/de\/?$/);
        // Use header nav to avoid footer nav ambiguity
        await expect(page.locator('header nav')).toContainText('Startseite');
    });

    test('language switcher preserves path', async ({ page }) => {
        await page.goto('/zh/media');
        await page.click('.lang-toggle');
        await page.locator('.lang-link:has-text("DE")').click();
        // URL may or may not have trailing slash
        await expect(page).toHaveURL(/\/de\/media\/?$/);
    });

    test('/en/ homepage loads correctly', async ({ page }) => {
        await page.goto('/en/');
        await expect(page.locator('.pillar-section')).toHaveCount(5);
    });

    test('/de/ homepage loads correctly', async ({ page }) => {
        await page.goto('/de/');
        await expect(page.locator('.pillar-section')).toHaveCount(5);
    });
});
