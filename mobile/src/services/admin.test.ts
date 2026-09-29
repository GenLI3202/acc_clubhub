import { afterEach, describe, expect, it, vi } from "vitest";

const { saved_tokens } = vi.hoisted(() => ({
    saved_tokens: new Map<string, string>(),
}));
vi.mock("./admin_session_store", () => ({
    clear_admin_refresh_token: async () => {
        saved_tokens.clear();
    },
    load_admin_refresh_token: async () => saved_tokens.get("refresh"),
    save_admin_refresh_token: async (token: string) => {
        saved_tokens.set("refresh", token);
    },
}));

import {
    AdminApiError,
    AdminOutcomeUnknownError,
    AdminSessionChangedError,
    has_admin_session,
    list_admin_events,
    login_admin,
    logout_admin,
    notify_admin_event,
    restore_admin_session,
} from "./admin";

function login_response(token = "test-token"): Response {
    return json_response({
        access_token: token,
        expires_in: 86_400,
        refresh_token: "refresh-token",
    });
}

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
    saved_tokens.clear();
    vi.unstubAllGlobals();
});

describe("administrator bearer session", () => {
    it("sends the token on protected requests and clears it after a 401", async () => {
        const fetch_mock = vi
            .fn()
            .mockResolvedValueOnce(login_response())
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
            .mockResolvedValueOnce(login_response())
            .mockReturnValueOnce(pending)
            .mockResolvedValueOnce(json_response({ status: "logged_out" }));
        vi.stubGlobal("fetch", fetch_mock);

        await login_admin("leader@example.test", "secret");
        const old_request = list_admin_events(0);
        const old_result = expect(old_request).rejects.toBeInstanceOf(
            AdminSessionChangedError,
        );
        await Promise.resolve();
        await logout_admin();
        resolve_request?.(json_response({ events: [{ id: 1 }], total: 1 }));
        await old_result;
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
        resolve_login?.(login_response("late-token"));

        await expect(login).rejects.toBeInstanceOf(AdminSessionChangedError);
        expect(has_admin_session()).toBe(false);
    });

    it("does not retry an uncertain notification write", async () => {
        const fetch_mock = vi
            .fn()
            .mockResolvedValueOnce(login_response())
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
                .mockResolvedValueOnce(login_response())
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
                .mockResolvedValueOnce(login_response())
                .mockResolvedValueOnce(json_response({ unexpected: true })),
        );
        await login_admin("leader@example.test", "secret");
        await expect(notify_admin_event(1)).rejects.toBeInstanceOf(
            AdminOutcomeUnknownError,
        );
    });

    it("restores a saved mobile session after an app restart", async () => {
        saved_tokens.set("refresh", "saved-refresh-token");
        const fetch_mock = vi.fn().mockResolvedValueOnce(login_response("restored"));
        vi.stubGlobal("fetch", fetch_mock);

        await restore_admin_session();

        expect(has_admin_session()).toBe(true);
        expect(fetch_mock.mock.calls[0]?.[0]).toContain("/auth/mobile-refresh");
        expect(JSON.parse(fetch_mock.mock.calls[0]?.[1]?.body)).toEqual({
            refresh_token: "saved-refresh-token",
        });
        expect(saved_tokens.get("refresh")).toBe("refresh-token");
    });

    it("removes an invalid persisted session", async () => {
        saved_tokens.set("refresh", "invalid-refresh-token");
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValueOnce(json_response({ detail: "expired" }, 401)),
        );

        await restore_admin_session();

        expect(has_admin_session()).toBe(false);
        expect(saved_tokens.has("refresh")).toBe(false);
    });

    it("renews an expiring access token before a protected request", async () => {
        const fetch_mock = vi
            .fn()
            .mockResolvedValueOnce(
                json_response({
                    access_token: "expiring",
                    expires_in: 30,
                    refresh_token: "first-refresh",
                }),
            )
            .mockResolvedValueOnce(login_response("renewed"))
            .mockResolvedValueOnce(json_response({ events: [], total: 0 }));
        vi.stubGlobal("fetch", fetch_mock);

        await login_admin("leader@example.test", "secret");
        await list_admin_events(0);

        expect(fetch_mock.mock.calls[1]?.[0]).toContain("/auth/mobile-refresh");
        expect(fetch_mock.mock.calls[2]?.[1]?.headers.Authorization).toBe(
            "Bearer renewed",
        );
        expect(saved_tokens.get("refresh")).toBe("refresh-token");
    });

    it("deletes the saved credential and revokes it on sign-out", async () => {
        const fetch_mock = vi
            .fn()
            .mockResolvedValueOnce(login_response())
            .mockResolvedValueOnce(json_response({ status: "logged_out" }));
        vi.stubGlobal("fetch", fetch_mock);

        await login_admin("leader@example.test", "secret");
        await logout_admin();

        expect(saved_tokens.has("refresh")).toBe(false);
        expect(has_admin_session()).toBe(false);
        expect(JSON.parse(fetch_mock.mock.calls[1]?.[1]?.body)).toEqual({
            refresh_token: "refresh-token",
        });
    });
});
