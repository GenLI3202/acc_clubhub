import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script_directory = dirname(fileURLToPath(import.meta.url));
const mobile_directory = resolve(script_directory, "..");
const xcode_version = spawnSync("xcodebuild", ["-version"], {
    encoding: "utf8",
});

if (xcode_version.error || xcode_version.status !== 0) {
    console.error(
        "A full Xcode installation is required to build the iOS Simulator app.",
    );
    process.exit(1);
}

const result = spawnSync(
    "xcodebuild",
    [
        "-project",
        "ios/App/App.xcodeproj",
        "-scheme",
        "App",
        "-configuration",
        "Debug",
        "-sdk",
        "iphonesimulator",
        "-derivedDataPath",
        "artifacts/ios-simulator",
        "CODE_SIGNING_ALLOWED=NO",
        "build",
    ],
    {
        cwd: mobile_directory,
        stdio: "inherit",
    },
);

if (result.error) {
    throw new Error(`Unable to start xcodebuild: ${result.error.message}`);
}
if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

console.log(
    "iOS Simulator app: artifacts/ios-simulator/Build/Products/Debug-iphonesimulator/App.app",
);
