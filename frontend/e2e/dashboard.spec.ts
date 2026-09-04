import { expect, test } from "@playwright/test";

test.describe("Dashboard event management", () => {
    test("bulk check-in selects only eligible confirmed RSVPs", async ({
        page,
    }) => {
        let requestBody: unknown = null;
        await page.route(
            "**/dashboard/api/events/1/rsvp/check-in/bulk",
            async (route) => {
                requestBody = route.request().postDataJSON();
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        success: true,
                        updated_count: 1,
                        rsvp_ids: [101],
                        attendance_status: "checked_in",
                    }),
                });
            },
        );
        await page.goto("/dashboard/events/1?preview=1");

        await expect(page.locator(".rsvp-select")).toHaveCount(1);
        await page.getByRole("button", {
            name: "Select all confirmed",
        }).click();
        await expect(page.locator("#bulk-selection-count")).toHaveText(
            "1 selected",
        );

        await page.locator("#bulk-check-in-btn").click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toContainText("1 selected confirmed riders");
        await dialog.getByRole("button", {
            name: "Check in selected",
        }).click();

        await expect.poll(() => requestBody).toEqual({
            rsvp_ids: [101],
            checked_in: true,
        });
        await expect(page.locator("#bulk-check-in-status")).toContainText(
            "1 riders updated",
        );
    });

    test("event table stays inside the mobile viewport", async ({ page }) => {
        await page.goto("/dashboard/events/1?preview=1");

        const dimensions = await page.evaluate(() => ({
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
        }));
        expect(dimensions.pageWidth).toBeLessThanOrEqual(
            dimensions.viewportWidth + 1,
        );
        await expect(page.locator(".table-shell")).toBeVisible();
    });
});
