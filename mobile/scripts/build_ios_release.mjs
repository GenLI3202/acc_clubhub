import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobile_directory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check_only = process.argv.includes("--check");
const team_id = process.env.IOS_TEAM_ID ?? "";
const build_number = process.env.IOS_BUILD_NUMBER ?? "";
const failures = [];

if (process.argv.slice(2).some((argument) => argument !== "--check")) {
    console.error("Usage: node scripts/build_ios_release.mjs [--check]");
    process.exit(1);
}

const xcode = spawnSync("xcodebuild", ["-version"], { encoding: "utf8" });
const xcode_major = Number(xcode.stdout?.match(/Xcode (\d+)/)?.[1]);
if (xcode.status !== 0 || !Number.isFinite(xcode_major) || xcode_major < 26) {
    failures.push(
        "Install Xcode 26+ and select its developer directory. " +
            "Command Line Tools alone cannot build this app.",
    );
} else {
    console.log(xcode.stdout.trim());
    const sdk = spawnSync("xcrun", ["--sdk", "iphoneos", "--show-sdk-path"], {
        encoding: "utf8",
    });
    if (sdk.status !== 0) {
        failures.push("Install the iOS platform support in Xcode Settings.");
    }
}

if (!/^[A-Z0-9]{10}$/.test(team_id)) {
    failures.push("Set IOS_TEAM_ID to your 10-character Apple Developer Team ID.");
}
if (!/^[1-9]\d{0,8}$/.test(build_number)) {
    failures.push(
        "Set IOS_BUILD_NUMBER to an unused positive integer (up to 9 digits).",
    );
}
if (!existsSync(resolve(mobile_directory, "node_modules/.bin/cap"))) {
    failures.push("Install mobile dependencies with npm ci first.");
}
if (failures.length) {
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}
if (check_only) {
    console.log(
        "Prerequisites found. Signing access is verified during archive/export.",
    );
    process.exit(0);
}

const output_directory = resolve(
    mobile_directory,
    "artifacts/ios-release",
    build_number,
);
if (existsSync(output_directory)) {
    console.error(
        `Output already exists: ${output_directory}. Use a new build number.`,
    );
    process.exit(1);
}

/**
 * Run one build step and stop before later steps if it fails.
 * @param {string} command
 * @param {string[]} arguments_list
 * @returns {void}
 */
function run_step(command, arguments_list) {
    const result = spawnSync(command, arguments_list, {
        cwd: mobile_directory,
        stdio: "inherit",
    });
    if (result.error) {
        console.error(result.error.message);
    }
    if (result.error || result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

run_step("npm", ["run", "ios:sync"]);
mkdirSync(output_directory, { recursive: true });
const archive_path = resolve(output_directory, "ACCClubHub.xcarchive");
const export_options_path = resolve(output_directory, "ExportOptions.plist");
writeFileSync(
    export_options_path,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
    "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key><string>app-store-connect</string>
    <key>destination</key><string>export</string>
    <key>teamID</key><string>${team_id}</string>
    <key>signingStyle</key><string>automatic</string>
    <key>manageAppVersionAndBuildNumber</key><false/>
    <key>uploadSymbols</key><true/>
</dict>
</plist>
`,
);
run_step("xcodebuild", [
    "-project",
    "ios/App/App.xcodeproj",
    "-scheme",
    "App",
    "-configuration",
    "Release",
    "-destination",
    "generic/platform=iOS",
    "-archivePath",
    archive_path,
    "-derivedDataPath",
    resolve(output_directory, "DerivedData"),
    "-allowProvisioningUpdates",
    `DEVELOPMENT_TEAM=${team_id}`,
    `CURRENT_PROJECT_VERSION=${build_number}`,
    "CODE_SIGN_STYLE=Automatic",
    "archive",
]);
run_step("xcodebuild", [
    "-exportArchive",
    "-archivePath",
    archive_path,
    "-exportOptionsPlist",
    export_options_path,
    "-exportPath",
    resolve(output_directory, "export"),
    "-allowProvisioningUpdates",
]);
console.log(`Signed archive and export: ${output_directory}`);
console.log("Upload using Xcode Organizer or Transporter; nothing was uploaded.");
