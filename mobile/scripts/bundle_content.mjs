import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script_directory = dirname(fileURLToPath(import.meta.url));
const mobile_directory = resolve(script_directory, "..");
const project_directory = resolve(mobile_directory, "..");
const source_content = resolve(
    project_directory,
    "frontend/dist/client/mobile-content/v1",
);
const target_content = resolve(mobile_directory, "public/mobile-content/v1");
const source_logo = resolve(
    project_directory,
    "frontend/public/images/transparent_red_logo.png",
);
const target_logo = resolve(mobile_directory, "public/app-logo.png");

await stat(source_content);
await mkdir(target_content, { recursive: true });
await cp(source_content, target_content, { recursive: true });
await cp(source_logo, target_logo);

console.log(`Bundled mobile content from ${source_content}`);
