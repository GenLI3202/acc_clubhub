import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.skip(!process.env.REGISTRATION_E2E, "Run with the isolated registration config");

for (const [lang, cancel, confirm, keep, success] of [
    ["zh", "取消我的报名", "确认取消报名", "保留报名", "你的本次报名已取消"],
    ["en", "Cancel my registration", "Confirm cancellation",
        "Keep my registration", "Your registration has been cancelled"],
    ["de", "Meine Anmeldung stornieren", "Stornierung bestätigen",
        "Anmeldung behalten", "Deine Anmeldung wurde storniert"],
]) {
    test(`personal email link requires confirmation (${lang})`, async (
        { page }, info,
    ) => {
        let posts = 0;
        page.on("request", (request) => {
            if (request.method() === "POST"
                && request.url().endsWith("/registration/cancel")) posts++;
        });
        const token = `test-${info.project.name}-${lang}`;
        const response = await page.goto(
            `/${lang}/events/2026-acc-season-opening?token=${token}`
                + "#registration-management",
        );
        expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
        const panel = page.locator("#registration-management");
        await expect(panel.getByRole("button", {
            name: cancel, exact: true,
        })).toBeVisible();
        expect(posts).toBe(0);
        await panel.getByRole("button", { name: cancel, exact: true }).click();
        await panel.getByRole("button", { name: keep, exact: true }).click();
        expect(posts).toBe(0);
        await panel.getByRole("button", { name: cancel, exact: true }).press("Enter");
        await page.screenshot({
            path: `/tmp/registration-${info.project.name}-${lang}.png`,
        });
        await panel.getByRole("button", { name: confirm, exact: true }).click();
        await expect(panel.getByRole("status")).toContainText(success);
        expect(posts).toBe(1);
        await expect(panel.locator("details")).toHaveCount(0);
        await page.reload();
        await expect(panel.getByRole("status")).toContainText(success);
        expect(posts).toBe(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth
            <= window.innerWidth)).toBe(true);
    });
}

test("failed request keeps booking and allows retry", async ({ page }, info) => {
    await page.goto("/en/events/2026-acc-season-opening"
        + `?token=test-${info.project.name}-failure`);
    const panel = page.locator("#registration-management");
    await page.route("**/registration/cancel", (route) => route.abort());
    await panel.getByRole("button", {
        name: "Cancel my registration", exact: true,
    }).click();
    await panel.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(panel.getByRole("alert")).toContainText("Cancellation failed");
    await expect(panel.getByRole("button", {
        name: "Confirm cancellation",
    })).toBeEnabled();
    await page.reload();
    await expect(panel).toContainText("Confirmed");
});

test("invalid and checked-in links explain next steps", async ({ page }, info) => {
    await page.goto("/en/events/2026-acc-season-opening?token=invalid");
    const panel = page.locator("#registration-management");
    await expect(panel.getByRole("alert")).toContainText("couldn't load");
    await expect(panel.getByRole("button")).toHaveCount(0);
    await page.goto("/en/events/2026-acc-season-opening"
        + `?token=test-${info.project.name}-closed`);
    await expect(panel.getByRole("status")).toContainText("checked in");
    await expect(panel.getByRole("button")).toHaveCount(0);
    await expect(panel.getByRole("link", { name: "Contact the club" })).toBeVisible();
});

test("email cancellation works without images", async ({ page }, info) => {
    for (const lang of ["zh", "en", "de"]) {
        const html = await readFile(
            `../docs/design/email_confirmation_${lang}.html`, "utf8",
        );
        await page.setContent(html);
        await page.addStyleTag({ content: "img { display: none !important; }" });
        const link = page.locator('a[href$="#registration-management"]');
        await expect(link).toBeVisible();
        await expect(link).toHaveCSS("text-decoration-line", "none");
        await expect(link).toHaveCSS("display", "inline-block");
        await expect(link).toHaveAttribute(
            "href", new RegExp(`/${lang}/events/.*token=`),
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth
            <= window.innerWidth)).toBe(true);
        await page.screenshot({
            path: `/tmp/email-cancellation-${info.project.name}-${lang}.png`,
            fullPage: true,
        });
    }
});
