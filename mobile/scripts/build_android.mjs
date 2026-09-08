import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script_directory = dirname(fileURLToPath(import.meta.url));
const mobile_directory = resolve(script_directory, "..");
const android_directory = resolve(mobile_directory, "android");

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
        ...process.env,
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
const target_apk = resolve(artifact_directory, "acc-clubhub-0.2.0-debug.apk");
await mkdir(artifact_directory, { recursive: true });
await copyFile(source_apk, target_apk);
console.log(`Android debug APK: ${target_apk}`);
