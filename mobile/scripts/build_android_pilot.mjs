import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const mobile_directory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const android_directory = resolve(mobile_directory, "android");
const required = [
    "ACC_PILOT_API_URL",
    "ACC_PILOT_CONTENT_BASE_URL",
    "ACC_PILOT_SITE_URL",
    "ACC_PILOT_KEYSTORE",
    "ACC_PILOT_STORE_PASSWORD",
    "ACC_PILOT_KEY_ALIAS",
    "ACC_PILOT_KEY_PASSWORD",
    "ACC_PILOT_SIGNING_OWNER",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
    throw new Error(`Pilot build requires: ${missing.join(", ")}`);
}

const signing_file = resolve(process.env.ACC_PILOT_KEYSTORE);
if (!existsSync(signing_file)) {
    throw new Error("Pilot signing keystore does not exist");
}
if (signing_file.startsWith(`${mobile_directory}/`)) {
    throw new Error("Keep the pilot signing keystore outside the repository");
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: mobile_directory,
        encoding: "utf8",
        ...options,
    });
    if (result.status !== 0) {
        throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
    }
    return (result.stdout ?? "").trim();
}

const dirty = run("git", ["status", "--porcelain"]);
if (dirty) {
    throw new Error("Commit or stash work before producing a traceable pilot APK");
}

const java_home = process.env.JAVA_HOME || "/opt/homebrew/opt/openjdk@21";
const android_home =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    "/opt/homebrew/share/android-commandlinetools";
const build_tools = resolve(android_home, "build-tools/36.0.0");
for (const tool of [
    resolve(java_home, "bin/java"),
    resolve(build_tools, "apksigner"),
    resolve(build_tools, "aapt"),
]) {
    if (!existsSync(tool)) {
        throw new Error(`Missing Android build prerequisite: ${tool}`);
    }
}

const environment = {
    ...process.env,
    ANDROID_HOME: android_home,
    ANDROID_SDK_ROOT: android_home,
    JAVA_HOME: java_home,
    GRADLE_USER_HOME: resolve(mobile_directory, ".gradle-user-home"),
    VITE_APP_ENV: "staging",
    VITE_API_URL: process.env.ACC_PILOT_API_URL,
    VITE_CONTENT_BASE_URL: process.env.ACC_PILOT_CONTENT_BASE_URL,
    VITE_SITE_URL: process.env.ACC_PILOT_SITE_URL,
};

run("npm", ["run", "sync"], { env: environment, stdio: "inherit" });
run(
    resolve(android_directory, "gradlew"),
    ["-p", android_directory, "assembleRelease"],
    {
        env: environment,
        stdio: "inherit",
    },
);

const source_apk = resolve(
    android_directory,
    "app/build/outputs/apk/release/app-release.apk",
);
const artifact_directory = resolve(mobile_directory, "artifacts");
const target_apk = resolve(artifact_directory, "acc-clubhub-0.3.0-pilot.apk");
await mkdir(artifact_directory, { recursive: true });
await copyFile(source_apk, target_apk);

const signer = run(resolve(build_tools, "apksigner"), [
    "verify",
    "--verbose",
    "--print-certs",
    target_apk,
]);
const badging = run(resolve(build_tools, "aapt"), ["dump", "badging", target_apk]);
const package_line = badging.split("\n").find((line) => line.startsWith("package:"));
const cert_sha256 = signer.match(/certificate SHA-256 digest: ([a-f0-9]+)/i)?.[1];
if (!package_line || !cert_sha256) {
    throw new Error("Could not confirm pilot package identity and signing certificate");
}

const manifest = {
    apk: target_apk,
    package: package_line,
    environment: "staging",
    api_url: environment.VITE_API_URL,
    content_base_url: environment.VITE_CONTENT_BASE_URL,
    site_url: environment.VITE_SITE_URL,
    source_revision: run("git", ["rev-parse", "HEAD"]),
    sha256: createHash("sha256").update(readFileSync(target_apk)).digest("hex"),
    signing_certificate_sha256: cert_sha256,
    signing_owner: process.env.ACC_PILOT_SIGNING_OWNER,
};
await writeFile(
    resolve(artifact_directory, "acc-clubhub-0.3.0-pilot.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Pilot APK and verification manifest: ${target_apk}`);
