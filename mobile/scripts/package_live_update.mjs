import { createHash, createPublicKey, createSign, verify } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script_directory = dirname(fileURLToPath(import.meta.url));
const mobile_directory = resolve(script_directory, "..");
const dist_directory = resolve(mobile_directory, "dist");
const artifact_directory = resolve(mobile_directory, "artifacts/live-update");
const config = JSON.parse(
    await readFile(resolve(mobile_directory, "live_update.config.json"), "utf8"),
);

function required_environment_value(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required to sign a live update.`);
    }
    return value;
}

function read_private_key() {
    const inline_key = process.env.LIVE_UPDATE_PRIVATE_KEY?.trim();
    if (inline_key) {
        return inline_key;
    }
    const key_path = process.env.LIVE_UPDATE_PRIVATE_KEY_PATH?.trim();
    if (!key_path) {
        throw new Error("Set LIVE_UPDATE_PRIVATE_KEY or LIVE_UPDATE_PRIVATE_KEY_PATH.");
    }
    return readFile(resolve(key_path), "utf8");
}

function validated_bundle_id(commit_sha) {
    if (!/^[a-f0-9]{40}$/i.test(commit_sha)) {
        throw new Error("GITHUB_SHA must be a full Git commit SHA.");
    }
    return `git-${commit_sha.toLowerCase()}`;
}

const commit_sha = required_environment_value("GITHUB_SHA");
const private_key = await read_private_key();
const bundle_id = validated_bundle_id(commit_sha);
const bundle_asset_name = `acc-mobile-${commit_sha.toLowerCase()}.zip`;
const bundle_path = resolve(artifact_directory, bundle_asset_name);
const manifest_path = resolve(artifact_directory, config.manifest_asset_name);
const history_manifest_path = resolve(
    artifact_directory,
    `manifest-${commit_sha.toLowerCase()}.json`,
);

await mkdir(artifact_directory, { recursive: true });
await rm(bundle_path, { force: true });

const zip_result = spawnSync("zip", ["-q", "-r", bundle_path, "."], {
    cwd: dist_directory,
    stdio: "inherit",
});
if (zip_result.status !== 0) {
    throw new Error("Unable to package the live update web bundle.");
}

const bundle = await readFile(bundle_path);
const checksum = createHash("sha256").update(bundle).digest("hex");
const signer = createSign("RSA-SHA256");
signer.update(bundle);
signer.end();
const signature = signer.sign(private_key, "base64");
const public_key = createPublicKey(
    await readFile(resolve(mobile_directory, "live_update_public.pem"), "utf8"),
);
if (!verify("RSA-SHA256", bundle, public_key, Buffer.from(signature, "base64"))) {
    throw new Error("Generated live update signature could not be verified.");
}

const asset_base_url =
    `https://github.com/${config.release_repository}/releases/download/` +
    `${config.release_tag}/`;
const manifest = {
    schema_version: config.schema_version,
    bundle_id,
    bundle_url: `${asset_base_url}${bundle_asset_name}`,
    checksum,
    signature,
    native_version_code: config.native_version_code,
    published_at: new Date().toISOString(),
};
const serialized_manifest = `${JSON.stringify(manifest, null, 4)}\n`;
await Promise.all([
    writeFile(manifest_path, serialized_manifest, "utf8"),
    writeFile(history_manifest_path, serialized_manifest, "utf8"),
]);

console.log(`Live update bundle: ${bundle_path}`);
console.log(`Live update manifest: ${manifest_path}`);
console.log(`Live update history: ${history_manifest_path}`);
console.log(`SHA-256: ${checksum}`);
