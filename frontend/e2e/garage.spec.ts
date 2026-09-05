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
    await expect.poll(() => photo.evaluate((element) => element.getAnimations().length))
        .toBeGreaterThan(0);
    await expect.poll(() => photo.evaluate((element) => element.getAnimations().length))
        .toBe(0);
    await expect(photo).toBeVisible();
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
    await page.locator(".bike-btn").first().evaluate((element) => {
        (element as HTMLElement).blur();
    });
    await page.mouse.move(0, 0);
    const before = await strip.evaluate((element) => element.scrollLeft);
    await expect.poll(() => strip.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(before + 10);
    await expect(page.locator(".garage-motion, .garage-prev, .garage-next"))
        .toHaveCount(0);
});

test("bike wobble respects reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/zh/about");
    await page.locator(".bike-btn").first().click();
    await expect(page.locator("[data-member-photo]")).toBeVisible();
    await expect(page.locator(".garage-flight")).toHaveCount(0);
    expect(await page.locator("[data-member-photo]").evaluate(
        (element) => element.getAnimations().length,
    )).toBe(0);
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


test("loop wraps and bike stays in its detail panel while wobbling", async ({ page }) => {
    await page.goto("/zh/about");
    const strip = page.locator(".garage-grid");
    await strip.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const period = await strip.evaluate((element) => {
        const lanes = element.querySelectorAll<HTMLElement>(".garage-lane");
        return lanes[1].offsetLeft - lanes[0].offsetLeft;
    });
    await strip.evaluate((element, distance) => { element.scrollLeft = distance - 2; }, period);
    await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeLessThan(100);
    await page.locator(".bike-btn").first().click();
    const photo = page.locator("[data-member-photo]");
    await expect.poll(() => photo.evaluate((element) => element.getAnimations().length))
        .toBeGreaterThan(0);
    await photo.evaluate((element) => {
        const animation = element.getAnimations()[0];
        animation.pause();
        animation.currentTime = Number(animation.effect!.getTiming().duration) / 4;
    });
    const bounds = await photo.boundingBox();
    const panel = await page.locator(".sheet-panel--member").boundingBox();
    expect(bounds!.x + bounds!.width / 2).toBeGreaterThan(panel!.x);
    expect(bounds!.x + bounds!.width / 2).toBeLessThan(panel!.x + panel!.width);
    await expect(photo).toBeVisible();
    await expect(photo).not.toHaveCSS("transform", "none");
    await expect(page.locator(".garage-flight")).toHaveCount(0);
    await photo.evaluate((element) => element.getAnimations()[0].finish());
    await expect(photo).toHaveCSS("transform", "none");
    await page.keyboard.press("Escape");
    expect(await photo.evaluate((element) => element.getAnimations().length)).toBe(0);
});

test("dragging the garage does not accidentally open a rider", async ({ page }) => {
    await page.goto("/zh/about");
    const strip = page.locator(".garage-grid");
    await strip.scrollIntoViewIfNeeded();
    await strip.hover();
    const box = await strip.boundingBox();
    const start_x = box!.x + box!.width * 0.75;
    const y = box!.y + box!.height * 0.5;
    const before = await strip.evaluate((element) => element.scrollLeft);
    await page.mouse.move(start_x, y);
    await page.mouse.down();
    await page.mouse.move(start_x - 80, y, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('[data-sheet="member"]')).toBeHidden();
    expect(await strip.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(before + 40);
});
