import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script_directory = dirname(fileURLToPath(import.meta.url));
const mobile_directory = resolve(script_directory, "..");
const android_directory = resolve(mobile_directory, "android");
const connected = process.argv.includes("--connected");
const build_environment = {
    ...process.env,
    VITE_API_URL: "https://acc-clubhub-events-ms.vercel.app",
    VITE_CONTENT_BASE_URL: "https://www.across-cc.de/mobile-content/live/v1",
    VITE_SITE_URL: "https://www.across-cc.de",
    VITE_APP_ENV: connected ? "production" : "preview",
};

const sync_result = spawnSync("npm", ["run", "sync"], {
    cwd: mobile_directory,
    env: build_environment,
    stdio: "inherit",
});
if (sync_result.status !== 0) {
    process.exit(sync_result.status ?? 1);
}

async function first_existing_directory(candidates) {
    for (const candidate of candidates.filter(Boolean)) {
        try {
            await access(candidate);
            return candidate;
        } catch {
            // Continue to the next known JDK or SDK location.
        }
    }
    return undefined;
}

async function is_java_21(java_home) {
    if (!java_home) {
        return false;
    }
    try {
        await access(java_home);
    } catch {
        return false;
    }

    const result = spawnSync(resolve(java_home, "bin/java"), ["-version"], {
        encoding: "utf8",
    });
    const version_output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    const major_version = version_output.match(/version "(?:1\.)?(\d+)/)?.[1];
    return result.status === 0 && major_version === "21";
}

async function find_java_21(candidates) {
    for (const candidate of candidates.filter(Boolean)) {
        if (await is_java_21(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

function find_macos_java_home() {
    if (process.platform !== "darwin") {
        return undefined;
    }
    const result = spawnSync("/usr/libexec/java_home", ["-v", "21"], {
        encoding: "utf8",
    });
    return result.status === 0 ? result.stdout.trim() : undefined;
}

const java_home = await find_java_21([
    process.env.JAVA_HOME,
    find_macos_java_home(),
    "/opt/homebrew/opt/openjdk@21",
    "/usr/local/opt/openjdk@21",
]);
if (!java_home) {
    throw new Error("JDK 21 is required. Set JAVA_HOME to a JDK 21 directory.");
}

const android_home = await first_existing_directory([
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    "/opt/homebrew/share/android-commandlinetools",
]);
const wrapper = resolve(
    android_directory,
    process.platform === "win32" ? "gradlew.bat" : "gradlew",
);
const result = spawnSync(wrapper, ["-p", android_directory, "assembleDebug"], {
    cwd: mobile_directory,
    env: {
        ...build_environment,
        ...(android_home
            ? { ANDROID_HOME: android_home, ANDROID_SDK_ROOT: android_home }
            : {}),
        GRADLE_USER_HOME: resolve(mobile_directory, ".gradle-user-home"),
        JAVA_HOME: java_home,
    },
    stdio: "inherit",
});
if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

const source_apk = resolve(
    android_directory,
    "app/build/outputs/apk/debug/app-debug.apk",
);
const artifact_directory = resolve(mobile_directory, "artifacts");
const artifact_name = connected
    ? "acc-clubhub-0.3.0-connected"
    : "acc-clubhub-0.3.0-debug";
const target_apk = resolve(artifact_directory, `${artifact_name}.apk`);
await mkdir(artifact_directory, { recursive: true });
await copyFile(source_apk, target_apk);
const build_tools = resolve(android_home, "build-tools/36.0.0");
const verification = spawnSync(
    resolve(build_tools, "apksigner"),
    ["verify", "--verbose", "--print-certs", target_apk],
    { encoding: "utf8", env: { ...process.env, JAVA_HOME: java_home } },
);
const badging = spawnSync(
    resolve(build_tools, "aapt"),
    ["dump", "badging", target_apk],
    { encoding: "utf8" },
);
if (verification.status !== 0 || badging.status !== 0) {
    throw new Error("Could not verify Android artifact identity and signature.");
}
const build = JSON.parse(
    await readFile(resolve(mobile_directory, "dist/app-build.json"), "utf8"),
);
await writeFile(
    resolve(artifact_directory, `${artifact_name}.json`),
    `${JSON.stringify(
        {
            ...build,
            artifact: target_apk,
            type: connected ? "connected-debug-signed" : "debug-test-only",
            package: badging.stdout
                .split("\n")
                .find((line) => line.startsWith("package:")),
            sha256: createHash("sha256")
                .update(await readFile(target_apk))
                .digest("hex"),
            signing_certificate_sha256: verification.stdout.match(
                /certificate SHA-256 digest: ([a-f0-9]+)/i,
            )?.[1],
            signature_verified: true,
            physical_device_tested: false,
        },
        null,
        2,
    )}\n`,
);
console.log(`Android ${connected ? "connected" : "preview"} APK: ${target_apk}`);
