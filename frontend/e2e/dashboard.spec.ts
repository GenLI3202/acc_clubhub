import { expect, test } from "@playwright/test";

test.describe("Dashboard event management", () => {
    test("three clear actions distinguish reminders from event changes", async ({ page }) => {
        let reminded = 0;
        let changed = 0;
        await page.route("**/api/admin/events/1/notify", async (route) => {
            reminded += 1;
            await route.fulfill({ json: { sent: 1, skipped: 0, failed: 0 } });
        });
        await page.route("**/dashboard/api/events/1/reschedule", async (route) => {
            changed += 1;
            await route.abort();
        });
        await page.goto("/dashboard/events/1?preview=1");
        await expect(page.getByRole("heading", { name: "Send ride reminder" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Change date & time" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Cancel event" })).toBeVisible();
        await expect(page.locator("#event-update-form")).toBeHidden();
        const departure = await page.locator("#event-departure").textContent();
        await page.getByRole("button", { name: "Review reminder" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toContainText("does not change the event");
        await dialog.getByRole("button", { name: "Send reminder email" }).click();
        await expect(page.locator("#notify-status")).toContainText("Sent: 1");
        expect(reminded).toBe(1);
        expect(changed).toBe(0);
        await expect(page.locator("#event-departure")).toHaveText(departure!);
    });

    test("date is required before reviewing a schedule change", async ({ page }) => {
        await page.goto("/dashboard/events/1?preview=1");
        await page.getByRole("button", { name: "Choose new date & time" }).click();
        const date = page.getByLabel("New date (Munich)", { exact: true });
        await expect(date).toHaveValue("2026-04-30");
        await page.getByLabel("Reason shown in the email").selectOption("weather");
        await date.fill("");
        await page.locator("#event-update-review").click();
        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(date).toBeFocused();
    });

    test("departure changes review both times and report delivery failures", async ({
        page,
    }) => {
        let request_body: unknown = null;
        await page.route("**/dashboard/api/events/1/reschedule", async (route) => {
            request_body = route.request().postDataJSON();
            await route.fulfill({
                json: {
                    success: true, event_date: "2030-07-07T07:30:00Z",
                    sent: 0, skipped: 0, failed: 1,
                },
            });
        });
        await page.goto("/dashboard/events/1?preview=1");
        await page.getByRole("button", { name: "Choose new date & time" }).click();
        await page.locator("#event-update-reason").selectOption("weather");
        await page.getByLabel("New date (Munich)", { exact: true }).fill("2030-07-07");
        await page.locator("#new-departure-time").fill("09:30");
        await page.locator("#event-update-review").click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toContainText("17:30");
        await expect(dialog).toContainText("09:30");
        await expect(dialog).toContainText("2030-07-07");
        await expect(dialog).toContainText("Europe/Berlin");
        await expect(dialog).toContainText("1 confirmed and waitlisted");
        await dialog.getByRole("button", { name: "Save date & time and email riders" }).click();
        await expect.poll(() => request_body).toEqual({
            reason: "weather", departure_date: "2030-07-07", departure_time: "09:30",
            expected_event_date: "2026-04-30T15:30:00.000Z",
        });
        await expect(page.locator("#event-update-status"))
            .toContainText("New date & time saved");
        await expect(page.locator("#event-update-status"))
            .toContainText("Failed: 1");
        await expect(page.locator("#event-update-review")).toBeDisabled();
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
        await page.getByRole("button", { name: "Review cancellation", exact: true }).click();
        await page.locator("#event-update-reason").selectOption("weather");
        await expect(page.locator("#new-departure-time")).toBeHidden();
        await expect(page.locator("#new-departure-date")).toBeHidden();
        await page.locator("#event-update-review").click();
        await page.getByRole("dialog").getByRole("button", {
            name: "Cancel event & send email",
        }).click();
        await expect.poll(() => request_body).toEqual({ reason: "weather" });
        await expect(page.locator("#event-update-status")).toContainText("Event cancelled");
    });

    test("dismissing the review does not send or save a change", async ({ page }) => {
        let requests = 0;
        await page.route("**/dashboard/api/events/1/reschedule", async (route) => {
            requests += 1;
            await route.abort();
        });
        await page.goto("/dashboard/events/1?preview=1");
        await page.getByRole("button", { name: "Choose new date & time" }).click();
        await page.locator("#event-update-reason").selectOption("weather");
        await page.getByLabel("New date (Munich)", { exact: true }).fill("2030-07-07");
        await page.locator("#new-departure-time").fill("09:30");
        await page.locator("#event-update-review").click();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(page.locator("#event-update-review")).toBeEnabled();
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
