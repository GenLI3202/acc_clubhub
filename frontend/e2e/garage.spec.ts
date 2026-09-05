import { expect, test } from "@playwright/test";

test("garage is a compact strip with scrollable mobile bike details", async ({
    page,
}, test_info) => {
    await page.goto("/zh/about");
    const strip = page.locator(".garage-grid");
    await strip.scrollIntoViewIfNeeded();
    const size = await strip.evaluate((element) => ({
        height: element.clientHeight,
        width: element.clientWidth,
        scroll_width: element.scrollWidth,
    }));
    expect(size.scroll_width).toBeGreaterThan(size.width);
    expect(size.height).toBeLessThan(450);
    await page.locator(".bike-btn").first().click();
    const dialog = page.locator(".sheet-panel--member");
    await expect(dialog).toBeVisible();
    const photo = dialog.locator("[data-member-photo]");
    await expect(photo).toHaveCSS("animation-name", /bike-wobble/);
    if (test_info.project.name === "mobile") {
        const media = await dialog.locator(".card-media").boundingBox();
        const text = await dialog.locator(".card-text").boundingBox();
        expect(text!.y).toBeGreaterThanOrEqual(media!.y + media!.height - 1);
        const scroll = dialog.locator(".deck--solo");
        await scroll.evaluate((element) => { element.scrollTop = 10000; });
        await expect(dialog.locator("[data-member-meta]")).toBeInViewport();
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator(".bike-btn").first()).toBeFocused();
    await page.locator(".garage-next").click();
    await expect.poll(() => strip.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
});

test("bike wobble respects reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/zh/about");
    await page.locator(".bike-btn").first().click();
    await expect(page.locator("[data-member-photo]")).toHaveCSS(
        "animation-name", "none",
    );
});

test("long member text scrolls inside a small mobile dialog", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/zh/about");
    await page.locator(".bike-btn").first().click();
    await page.locator("[data-member-bio]").evaluate((element) => {
        element.textContent = "A longer rider biography for scroll testing. ".repeat(25);
    });
    const scroll = page.locator(".deck--solo");
    await scroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    expect(await scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator("[data-member-meta]")).toBeInViewport();
    await expect(page.locator(".sheet-panel--member .sheet-x")).toBeInViewport();
});
