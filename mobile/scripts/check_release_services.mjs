const api_url = "https://acc-clubhub-events-ms.vercel.app";
const site_url = "https://www.across-cc.de";

async function read_json(url, require_cors = true) {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/json", Origin: "https://localhost" },
    });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const origin = response.headers.get("access-control-allow-origin");
    if (require_cors && origin !== "*" && origin !== "https://localhost") {
        throw new Error(`${url}: Android origin is not allowed by CORS`);
    }
    return response.json();
}

const checks = [
    ...["zh", "en", "de"].map(async (locale) => {
        const feed = await read_json(
            `${site_url}/mobile-content/live/v1/${locale}.json`,
        );
        if (
            feed.schema_version !== 1 ||
            feed.locale !== locale ||
            !Array.isArray(feed.items)
        ) {
            throw new Error(`Invalid ${locale} mobile feed`);
        }
        console.log(`${locale} live feed: ${feed.items.length} items`);
    }),
    (async () => {
        const index = await read_json(
            `${site_url}/api/registration-events/index.json`,
            false,
        );
        if (!Array.isArray(index.events))
            throw new Error("Invalid published event index");
        console.log(`Published event index: ${index.events.length} events`);
    })(),
    (async () => {
        const contract = await read_json(`${api_url}/openapi.json`);
        for (const [path, method] of [
            ["/auth/mobile-login", "post"],
            ["/auth/mobile-logout", "post"],
            ["/api/rsvp", "post"],
            ["/api/events", "get"],
            ["/api/events/{slug}", "get"],
            ["/api/admin/events/page", "get"],
            ["/api/admin/events/{event_id}/rsvps/page", "get"],
            ["/api/admin/events/{event_id}/rsvp/check-in", "post"],
            ["/api/admin/events/{event_id}/rsvp/check-in/undo", "post"],
            ["/api/admin/events/{event_id}/rsvp/cancel", "post"],
            ["/api/admin/events/{event_id}/rsvp/restore", "post"],
            ["/api/admin/events/{event_id}/cancel", "post"],
            ["/api/admin/events/{event_id}/reschedule", "post"],
            ["/api/admin/events/{event_id}/notify", "post"],
        ]) {
            if (!contract.paths?.[path]?.[method])
                throw new Error(`API missing ${method.toUpperCase()} ${path}`);
        }
        const events = await read_json(
            `${api_url}/api/events?limit=1&upcoming_only=true`,
        );
        if (!Array.isArray(events)) throw new Error("Invalid public event list");
        console.log("Deployed API contract and public event list: available");
    })(),
];
const results = await Promise.allSettled(checks);
const failures = results.filter((result) => result.status === "rejected");
for (const result of failures) console.error(result.reason.message);
if (failures.length) process.exitCode = 1;
