import { APP_CONFIG } from "../config";
import {
    clear_admin_refresh_token,
    load_admin_refresh_token,
    save_admin_refresh_token,
} from "./admin_session_store";

export interface AdminEvent {
    id: number;
    title: string;
    slug: string;
    event_date: string | null;
    location: string | null;
    confirmed_count: number;
    waitlist_count: number;
    cancelled_count: number;
    max_participants: number | null;
    cancelled_at: string | null;
}

export interface AdminRsvp {
    id: number;
    name: string;
    email: string;
    status: string;
    checked_in_at: string | null;
    created_at: string | null;
}

export interface DeliveryResult {
    sent?: number;
    skipped?: number;
    failed?: number;
    success?: boolean;
    message?: string;
    new_status?: string;
    promoted?: string;
}

export class AdminApiError extends Error {
    public constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = "AdminApiError";
    }
}

export class AdminSessionChangedError extends Error {
    public constructor() {
        super("Administrator session changed");
        this.name = "AdminSessionChangedError";
    }
}

export class AdminOutcomeUnknownError extends Error {
    public constructor() {
        super("Administrator action result could not be confirmed");
        this.name = "AdminOutcomeUnknownError";
    }
}

let active_token: string | undefined;
let active_refresh_token: string | undefined;
let access_expires_at = 0;
let session_generation = 0;
let session_restoring = false;
let restore_promise: Promise<void> | undefined;
let refresh_promise: Promise<string> | undefined;
let storage_task: Promise<void> = Promise.resolve();
const session_listeners = new Set<() => void>();

interface MobileSessionResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

function is_record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function is_count(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function is_nullable_string(value: unknown): value is string | null {
    return value === null || typeof value === "string";
}

function is_admin_event(value: unknown): value is AdminEvent {
    if (!is_record(value)) {
        return false;
    }
    return (
        is_count(value.id) &&
        typeof value.title === "string" &&
        typeof value.slug === "string" &&
        is_nullable_string(value.event_date) &&
        is_nullable_string(value.location) &&
        is_count(value.confirmed_count) &&
        is_count(value.waitlist_count) &&
        is_count(value.cancelled_count) &&
        (value.max_participants === null || is_count(value.max_participants)) &&
        is_nullable_string(value.cancelled_at)
    );
}

function is_admin_rsvp(value: unknown): value is AdminRsvp {
    if (!is_record(value)) {
        return false;
    }
    return (
        is_count(value.id) &&
        typeof value.name === "string" &&
        typeof value.email === "string" &&
        typeof value.status === "string" &&
        is_nullable_string(value.checked_in_at) &&
        is_nullable_string(value.created_at)
    );
}

function parse_event_page(value: unknown): { events: AdminEvent[]; total: number } {
    if (
        !is_record(value) ||
        !Array.isArray(value.events) ||
        !value.events.every(is_admin_event) ||
        !is_count(value.total)
    ) {
        throw new Error("Invalid administrator event list");
    }
    return { events: value.events, total: value.total };
}

function parse_rsvp_page(value: unknown): { rsvps: AdminRsvp[]; total: number } {
    if (
        !is_record(value) ||
        !Array.isArray(value.rsvps) ||
        !value.rsvps.every(is_admin_rsvp) ||
        !is_count(value.total)
    ) {
        throw new Error("Invalid administrator participant list");
    }
    return { rsvps: value.rsvps, total: value.total };
}

function parse_delivery_result(value: unknown): DeliveryResult {
    if (!is_record(value)) {
        throw new Error("Invalid administrator action response");
    }
    const counters = [value.sent, value.skipped, value.failed];
    if (
        (value.success !== true && !counters.every(is_count)) ||
        counters.some((count) => count !== undefined && !is_count(count)) ||
        (value.message !== undefined && typeof value.message !== "string") ||
        (value.new_status !== undefined && typeof value.new_status !== "string") ||
        (value.promoted !== undefined && typeof value.promoted !== "string")
    ) {
        throw new Error("Invalid administrator action response");
    }
    return value;
}

function notify_session(): void {
    for (const listener of session_listeners) {
        listener();
    }
}

function publish_session(session?: MobileSessionResponse): void {
    active_token = session?.access_token;
    active_refresh_token = session?.refresh_token;
    access_expires_at = session ? Date.now() + session.expires_in * 1_000 : 0;
    session_generation += 1;
    notify_session();
}

function persist_refresh_token(token?: string): Promise<void> {
    const next = storage_task
        .catch(() => undefined)
        .then(() =>
            token ? save_admin_refresh_token(token) : clear_admin_refresh_token(),
        );
    storage_task = next;
    return next;
}

function parse_mobile_session(value: unknown): MobileSessionResponse {
    if (
        !is_record(value) ||
        typeof value.access_token !== "string" ||
        !value.access_token ||
        typeof value.refresh_token !== "string" ||
        !value.refresh_token ||
        typeof value.expires_in !== "number" ||
        !Number.isFinite(value.expires_in) ||
        value.expires_in <= 0
    ) {
        throw new Error("Invalid administrator login response");
    }
    return {
        access_token: value.access_token,
        refresh_token: value.refresh_token,
        expires_in: value.expires_in,
    };
}

export function has_admin_session(): boolean {
    return active_token !== undefined;
}

export function admin_session_is_restoring(): boolean {
    return session_restoring;
}

export function subscribe_admin_session(listener: () => void): () => void {
    session_listeners.add(listener);
    return (): void => {
        session_listeners.delete(listener);
    };
}

async function error_message(response: Response): Promise<string> {
    try {
        const payload: unknown = await response.json();
        if (typeof payload === "object" && payload !== null && "detail" in payload) {
            const detail = payload.detail;
            if (typeof detail === "string") {
                return detail;
            }
            if (
                typeof detail === "object" &&
                detail !== null &&
                "message" in detail &&
                typeof detail.message === "string"
            ) {
                return detail.message;
            }
        }
    } catch {
        // Keep the status message for non-JSON errors.
    }
    return `Request failed with ${response.status}`;
}

async function exchange_refresh_token(
    refresh_token: string,
): Promise<MobileSessionResponse> {
    const response = await fetch(`${APP_CONFIG.api_url}/auth/mobile-refresh`, {
        body: JSON.stringify({ refresh_token }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
        throw new AdminApiError(await error_message(response), response.status);
    }
    return parse_mobile_session(await response.json());
}

async function renew_admin_session(
    refresh_token: string,
    generation: number,
): Promise<string> {
    const session = await exchange_refresh_token(refresh_token);
    if (generation !== session_generation) {
        throw new AdminSessionChangedError();
    }
    await persist_refresh_token(session.refresh_token);
    if (generation !== session_generation) {
        throw new AdminSessionChangedError();
    }
    if (has_admin_session()) {
        active_token = session.access_token;
        active_refresh_token = session.refresh_token;
        access_expires_at = Date.now() + session.expires_in * 1_000;
    } else {
        publish_session(session);
    }
    return session.access_token;
}

async function clear_local_admin_session(): Promise<void> {
    publish_session();
    await persist_refresh_token();
}

export function restore_admin_session(): Promise<void> {
    if (APP_CONFIG.stage === "preview" || has_admin_session()) {
        return Promise.resolve();
    }
    if (restore_promise) {
        return restore_promise;
    }
    const generation = session_generation;
    session_restoring = true;
    notify_session();
    restore_promise = (async () => {
        try {
            const token = await load_admin_refresh_token();
            if (token && generation === session_generation) {
                await renew_admin_session(token, generation);
            }
        } catch (error) {
            if (
                generation === session_generation &&
                error instanceof AdminApiError &&
                (error.status === 401 || error.status === 403)
            ) {
                await clear_local_admin_session();
            }
        } finally {
            session_restoring = false;
            restore_promise = undefined;
            notify_session();
        }
    })();
    return restore_promise;
}

async function ensure_admin_access(): Promise<string> {
    if (!active_token) {
        throw new AdminApiError("Not authenticated", 401);
    }
    if (Date.now() < access_expires_at - 60_000) {
        return active_token;
    }
    if (!active_refresh_token) {
        await clear_local_admin_session();
        throw new AdminApiError("Administrator session expired", 401);
    }
    if (!refresh_promise) {
        const generation = session_generation;
        refresh_promise = renew_admin_session(active_refresh_token, generation)
            .catch(async (error: unknown) => {
                if (
                    generation === session_generation &&
                    error instanceof AdminApiError &&
                    (error.status === 401 || error.status === 403)
                ) {
                    await clear_local_admin_session();
                }
                throw error;
            })
            .finally(() => {
                refresh_promise = undefined;
            });
    }
    return refresh_promise;
}

async function admin_request<T>(
    path: string,
    method: "GET" | "POST" = "GET",
    body?: object,
    parse: (value: unknown) => T = (value) => value as T,
): Promise<T> {
    if (APP_CONFIG.stage === "preview") {
        throw new AdminApiError("Management is disabled in the preview build", 403);
    }
    const generation = session_generation;
    const token = await ensure_admin_access();
    if (generation !== session_generation) {
        throw new AdminSessionChangedError();
    }

    let response: Response;
    try {
        response = await fetch(`${APP_CONFIG.api_url}${path}`, {
            body: body ? JSON.stringify(body) : undefined,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                ...(body ? { "Content-Type": "application/json" } : {}),
            },
            method,
            signal: AbortSignal.timeout(20_000),
        });
    } catch (error) {
        if (method === "POST") {
            throw new AdminOutcomeUnknownError();
        }
        throw error;
    }
    if (generation !== session_generation) {
        throw new AdminSessionChangedError();
    }
    if (response.status === 401 || response.status === 403) {
        await clear_local_admin_session();
        throw new AdminApiError("Administrator session expired", response.status);
    }
    if (method === "POST" && response.status >= 500) {
        throw new AdminOutcomeUnknownError();
    }
    if (!response.ok) {
        throw new AdminApiError(await error_message(response), response.status);
    }
    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        if (method === "POST") {
            throw new AdminOutcomeUnknownError();
        }
        throw new Error("Invalid administrator response");
    }
    let result: T;
    try {
        result = parse(payload);
    } catch (error) {
        if (method === "POST") {
            throw new AdminOutcomeUnknownError();
        }
        throw error;
    }
    if (generation !== session_generation) {
        throw new AdminSessionChangedError();
    }
    return result;
}

export async function login_admin(email: string, password: string): Promise<void> {
    if (APP_CONFIG.stage === "preview") {
        throw new AdminApiError("Management is disabled in the preview build", 403);
    }
    const generation = session_generation;
    const response = await fetch(`${APP_CONFIG.api_url}/auth/mobile-login`, {
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
        throw new AdminApiError(await error_message(response), response.status);
    }
    const session = parse_mobile_session(await response.json());
    if (generation !== session_generation) {
        throw new AdminSessionChangedError();
    }
    await persist_refresh_token(session.refresh_token);
    if (generation !== session_generation) {
        throw new AdminSessionChangedError();
    }
    publish_session(session);
}

export async function logout_admin(): Promise<void> {
    const token = active_token;
    const refresh_token = active_refresh_token;
    if (APP_CONFIG.stage === "preview") {
        publish_session();
        return;
    }
    await clear_local_admin_session();
    if (!token && !refresh_token) {
        return;
    }
    const response = await fetch(`${APP_CONFIG.api_url}/auth/mobile-logout`, {
        body: refresh_token ? JSON.stringify({ refresh_token }) : undefined,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(refresh_token ? { "Content-Type": "application/json" } : {}),
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok && response.status !== 401) {
        throw new AdminApiError(await error_message(response), response.status);
    }
}

export function list_admin_events(offset: number): Promise<{
    events: AdminEvent[];
    total: number;
}> {
    return admin_request(
        `/api/admin/events/page?offset=${offset}&limit=20`,
        "GET",
        undefined,
        parse_event_page,
    );
}

export function list_admin_rsvps(
    event_id: number,
    offset: number,
): Promise<{ rsvps: AdminRsvp[]; total: number }> {
    return admin_request(
        `/api/admin/events/${event_id}/rsvps/page?offset=${offset}&limit=20`,
        "GET",
        undefined,
        parse_rsvp_page,
    );
}

export function update_admin_rsvp(
    event_id: number,
    rsvp_id: number,
    action: "check-in" | "check-in/undo" | "cancel" | "restore",
): Promise<DeliveryResult> {
    return admin_request(
        `/api/admin/events/${event_id}/rsvp/${action}`,
        "POST",
        { rsvp_id },
        parse_delivery_result,
    );
}

export function cancel_admin_event(
    event_id: number,
    reason: string,
): Promise<DeliveryResult> {
    return admin_request(
        `/api/admin/events/${event_id}/cancel`,
        "POST",
        { reason },
        parse_delivery_result,
    );
}

export function reschedule_admin_event(
    event_id: number,
    reason: string,
    departure_date: string,
    departure_time: string,
    expected_event_date: string,
): Promise<DeliveryResult> {
    return admin_request(
        `/api/admin/events/${event_id}/reschedule`,
        "POST",
        { departure_date, departure_time, expected_event_date, reason },
        parse_delivery_result,
    );
}

export function notify_admin_event(event_id: number): Promise<DeliveryResult> {
    return admin_request(
        `/api/admin/events/${event_id}/notify`,
        "POST",
        undefined,
        parse_delivery_result,
    );
}
