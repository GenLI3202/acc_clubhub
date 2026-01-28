import { test, expect } from '@playwright/test';

test.describe('Routing & i18n', () => {
    test('/ redirects to /zh/', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL('/zh/');
    });

    test('homepage displays 5 section cards', async ({ page }) => {
        await page.goto('/zh/');
        await expect(page.locator('.hub-card')).toHaveCount(5);
    });

    test('homepage has correct title', async ({ page }) => {
        await page.goto('/zh/');
        await expect(page).toHaveTitle(/ACC ClubHub/);
    });

    test('language switcher works zh -> en', async ({ page }) => {
        await page.goto('/zh/');
        await page.click('.lang-link:has-text("EN")');
        await expect(page).toHaveURL('/en/');
        await expect(page.locator('nav')).toContainText('Home');
    });

    test('language switcher works en -> de', async ({ page }) => {
        await page.goto('/en/');
        await page.click('.lang-link:has-text("DE")');
        await expect(page).toHaveURL('/de/');
        await expect(page.locator('nav')).toContainText('Startseite');
    });

    test('language switcher preserves path', async ({ page }) => {
        await page.goto('/zh/media');
        await page.click('.lang-link:has-text("DE")');
        await expect(page).toHaveURL('/de/media');
    });

    test('/en/ homepage loads correctly', async ({ page }) => {
        await page.goto('/en/');
        await expect(page.locator('.hub-card')).toHaveCount(5);
    });

    test('/de/ homepage loads correctly', async ({ page }) => {
        await page.goto('/de/');
        await expect(page.locator('.hub-card')).toHaveCount(5);
    });
});
