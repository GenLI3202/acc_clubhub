export interface LiveUpdateManifest {
    schema_version: 1;
    bundle_id: string;
    bundle_url: string;
    checksum: string;
    signature: string;
    native_version_code: string;
    published_at: string;
}

const BUNDLE_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function is_record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function read_json(value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    try {
        return JSON.parse(value) as unknown;
    } catch {
        throw new Error("Live update manifest is not valid JSON.");
    }
}

function require_string(value: Record<string, unknown>, field: string): string {
    const candidate = value[field];
    if (typeof candidate !== "string" || !candidate) {
        throw new Error(`Live update manifest has an invalid ${field}.`);
    }
    return candidate;
}

export function release_asset_base_url(
    repository: string,
    release_tag: string,
): string {
    return `https://github.com/${repository}/releases/download/${release_tag}/`;
}

export function release_manifest_url(
    repository: string,
    release_tag: string,
    asset_name: string,
): string {
    return `${release_asset_base_url(repository, release_tag)}${asset_name}`;
}

export function parse_live_update_manifest(
    input: unknown,
    expected_native_version_code: string,
    expected_asset_base_url: string,
): LiveUpdateManifest {
    const value = read_json(input);
    if (!is_record(value) || value.schema_version !== 1) {
        throw new Error("Unsupported live update manifest schema.");
    }

    const bundle_id = require_string(value, "bundle_id");
    const bundle_url = require_string(value, "bundle_url");
    const checksum = require_string(value, "checksum");
    const signature = require_string(value, "signature");
    const native_version_code = require_string(value, "native_version_code");
    const published_at = require_string(value, "published_at");

    if (!BUNDLE_ID_PATTERN.test(bundle_id) || bundle_id === "public") {
        throw new Error("Live update bundle ID is invalid.");
    }
    if (!CHECKSUM_PATTERN.test(checksum)) {
        throw new Error("Live update checksum is invalid.");
    }
    if (!SIGNATURE_PATTERN.test(signature)) {
        throw new Error("Live update signature is invalid.");
    }
    if (native_version_code !== expected_native_version_code) {
        throw new Error("Live update is not compatible with this native app.");
    }
    if (!bundle_url.startsWith(expected_asset_base_url)) {
        throw new Error("Live update bundle URL is not trusted.");
    }

    const parsed_bundle_url = new URL(bundle_url);
    if (
        parsed_bundle_url.protocol !== "https:" ||
        parsed_bundle_url.username ||
        parsed_bundle_url.password ||
        !parsed_bundle_url.pathname.endsWith(".zip")
    ) {
        throw new Error("Live update bundle URL is invalid.");
    }
    if (!Number.isFinite(Date.parse(published_at))) {
        throw new Error("Live update publish time is invalid.");
    }

    return {
        schema_version: 1,
        bundle_id,
        bundle_url,
        checksum,
        signature,
        native_version_code,
        published_at,
    };
}
