import { expect, test } from "@playwright/test";

test.describe("Dashboard event management", () => {
    test("departure changes review both times and report delivery failures", async ({
        page,
    }) => {
        let request_body: unknown = null;
        await page.route("**/dashboard/api/events/1/reschedule", async (route) => {
            request_body = route.request().postDataJSON();
            await route.fulfill({
                json: {
                    success: true, event_date: "2026-04-30T07:30:00Z",
                    sent: 0, skipped: 0, failed: 1,
                },
            });
        });
        await page.goto("/dashboard/events/1?preview=1");
        await page.locator("#event-cancellation-reason").selectOption("weather");
        await page.locator("#event-update-action").selectOption("reschedule");
        await page.locator("#new-departure-time").fill("09:30");
        await page.locator("#cancel-event-btn").click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toContainText("17:30");
        await expect(dialog).toContainText("09:30");
        await expect(dialog).toContainText("Europe/Berlin");
        await expect(dialog).toContainText("1 confirmed and waitlisted");
        await dialog.getByRole("button", { name: "Save time & send email" }).click();
        await expect.poll(() => request_body).toEqual({
            reason: "weather", departure_time: "09:30",
            expected_event_date: "2026-04-30T15:30:00.000Z",
        });
        await expect(page.locator("#cancel-event-status"))
            .toContainText("Departure time saved");
        await expect(page.locator("#cancel-event-status"))
            .toContainText("Failed: 1");
        await expect(page.locator("#cancel-event-btn")).toBeDisabled();
        await expect(page.locator("#event-departure")).toContainText("09:30");
    });

    test("event cancellation still sends only a cancellation reason", async ({
        page,
    }) => {
        let request_body: unknown = null;
        await page.route("**/api/admin/events/1/cancel", async (route) => {
            request_body = route.request().postDataJSON();
            await route.fulfill({json: {success: true, sent: 1, skipped: 0, failed: 0}});
        });
        await page.goto("/dashboard/events/1?preview=1");
        await page.locator("#event-cancellation-reason").selectOption("weather");
        await page.locator("#event-update-action").selectOption("cancel");
        await expect(page.locator("#new-departure-time")).toBeHidden();
        await page.locator("#cancel-event-btn").click();
        await page.getByRole("dialog").getByRole("button", {
            name: "Cancel event & send email",
        }).click();
        await expect.poll(() => request_body).toEqual({ reason: "weather" });
        await expect(page.locator("#cancel-event-status")).toContainText("Event cancelled");
    });

    test("dismissing the review does not send or save a change", async ({ page }) => {
        let requests = 0;
        await page.route("**/dashboard/api/events/1/reschedule", async (route) => {
            requests += 1;
            await route.abort();
        });
        await page.goto("/dashboard/events/1?preview=1");
        await page.locator("#event-cancellation-reason").selectOption("weather");
        await page.locator("#event-update-action").selectOption("reschedule");
        await page.locator("#new-departure-time").fill("09:30");
        await page.locator("#cancel-event-btn").click();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(page.locator("#cancel-event-btn")).toBeEnabled();
        expect(requests).toBe(0);
    });

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
