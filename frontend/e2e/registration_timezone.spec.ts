import { test, expect } from "@playwright/test";

test.skip(!process.env.REGISTRATION_E2E, "Use the isolated registration config");
test.use({ timezoneId: "America/New_York" });

test("September 6 registration sends 09:30 Munich as 07:30 UTC", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-09-05T10:00:00Z") });
    const slug = "acc-epic-ride-munich-linden-loop-2026-09-05";
    let payload: Record<string, unknown> | undefined;
    await page.route("**/api/rsvp", async (route) => {
        payload = route.request().postDataJSON();
        await route.fulfill({ json: {
            success: true, status: "confirmed", rsvp_id: 1, message: "Registered",
        } });
    });
    await page.goto(`/zh/events/${slug}`);
    await expect(page.locator("#registration-container"))
        .toHaveAttribute("data-event-date", "2026-09-06T07:30:00.000Z");
    await expect(page.locator("#registration-container"))
        .toHaveAttribute("data-registration-deadline", "2026-09-05T20:00:00.000Z");
    await page.locator("#reg-email").fill("timezone-test@example.com");
    await page.locator("#reg-name").fill("Timezone Test");
    const form = page.locator(".event-registration-form");
    // Accept the two required form declarations; notification opt-in stays off.
    await form.locator('input[type="checkbox"]').nth(0).check();
    await form.locator('input[type="checkbox"]').nth(1).check();
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(".rsvp-success")).toBeVisible();
    expect(payload?.event_date).toBe("2026-09-06T07:30:00.000Z");
    expect(payload?.registration_deadline).toBe("2026-09-05T20:00:00.000Z");
});
