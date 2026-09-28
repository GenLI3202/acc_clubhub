import { afterEach, describe, expect, it, vi } from "vitest";

import {
    AdminApiError,
    AdminOutcomeUnknownError,
    AdminSessionChangedError,
    has_admin_session,
    list_admin_events,
    login_admin,
    logout_admin,
    notify_admin_event,
} from "./admin";

function json_response(value: object, status = 200): Response {
    return new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json" },
        status,
    });
}

afterEach(async () => {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(json_response({ status: "logged_out" })),
    );
    await logout_admin();
    vi.unstubAllGlobals();
});

describe("administrator bearer session", () => {
    it("sends the token on protected requests and clears it after a 401", async () => {
        const fetch_mock = vi
            .fn()
            .mockResolvedValueOnce(json_response({ access_token: "test-token" }))
            .mockResolvedValueOnce(json_response({ events: [], total: 0 }))
            .mockResolvedValueOnce(json_response({ detail: "expired" }, 401));
        vi.stubGlobal("fetch", fetch_mock);

        await login_admin("leader@example.test", "secret");
        await list_admin_events(0);
        expect(fetch_mock.mock.calls[1]?.[1]?.headers.Authorization).toBe(
            "Bearer test-token",
        );
        await expect(list_admin_events(0)).rejects.toBeInstanceOf(AdminApiError);
        expect(has_admin_session()).toBe(false);
    });

    it("discards a private response that arrives after logout", async () => {
        let resolve_request: ((response: Response) => void) | undefined;
        const pending = new Promise<Response>((resolve) => {
            resolve_request = resolve;
        });
        const fetch_mock = vi
            .fn()
            .mockResolvedValueOnce(json_response({ access_token: "test-token" }))
            .mockReturnValueOnce(pending)
            .mockResolvedValueOnce(json_response({ status: "logged_out" }));
        vi.stubGlobal("fetch", fetch_mock);

        await login_admin("leader@example.test", "secret");
        const old_request = list_admin_events(0);
        await logout_admin();
        resolve_request?.(json_response({ events: [{ id: 1 }], total: 1 }));
        await expect(old_request).rejects.toBeInstanceOf(AdminSessionChangedError);
        expect(has_admin_session()).toBe(false);
    });

    it("discards a login response that arrives after a session change", async () => {
        let resolve_login: ((response: Response) => void) | undefined;
        const pending = new Promise<Response>((resolve) => {
            resolve_login = resolve;
        });
        vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending));

        const login = login_admin("leader@example.test", "secret");
        await logout_admin();
        resolve_login?.(json_response({ access_token: "late-token" }));

        await expect(login).rejects.toBeInstanceOf(AdminSessionChangedError);
        expect(has_admin_session()).toBe(false);
    });

    it("does not retry an uncertain notification write", async () => {
        const fetch_mock = vi
            .fn()
            .mockResolvedValueOnce(json_response({ access_token: "test-token" }))
            .mockRejectedValueOnce(new TypeError("Network failed"));
        vi.stubGlobal("fetch", fetch_mock);

        await login_admin("leader@example.test", "secret");
        await expect(notify_admin_event(1)).rejects.toBeInstanceOf(
            AdminOutcomeUnknownError,
        );
        expect(fetch_mock).toHaveBeenCalledTimes(2);
    });

    it("rejects malformed private list data", async () => {
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValueOnce(json_response({ access_token: "test-token" }))
                .mockResolvedValueOnce(
                    json_response({ events: [{ id: 1 }], total: 1 }),
                ),
        );
        await login_admin("leader@example.test", "secret");
        await expect(list_admin_events(0)).rejects.toThrow(
            "Invalid administrator event list",
        );
    });

    it("treats malformed success after a write as an unknown result", async () => {
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValueOnce(json_response({ access_token: "test-token" }))
                .mockResolvedValueOnce(json_response({ unexpected: true })),
        );
        await login_admin("leader@example.test", "secret");
        await expect(notify_admin_event(1)).rejects.toBeInstanceOf(
            AdminOutcomeUnknownError,
        );
    });
});
