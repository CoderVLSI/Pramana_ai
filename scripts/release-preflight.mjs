import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const app = read("apps/mobile/app.json").expo;
const eas = read("apps/mobile/eas.json");
const mobile = read("apps/mobile/package.json");
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
check(/^~?54\./.test(mobile.dependencies.expo), "Review installed Expo SDK target API; this preflight assumes SDK 54 / API 36.");
check(Boolean(app.android?.package), "Set the permanent Android application ID.");
check(Number.isInteger(app.android?.versionCode) && app.android.versionCode > 0, "Set an initial positive android.versionCode.");
check(eas.build?.production?.android?.buildType === "app-bundle", "Production must build a Play Store AAB.");
check(eas.build?.production?.distribution === "store", "Production distribution must be store.");
check(eas.build?.production?.autoIncrement === true && eas.cli?.appVersionSource === "remote", "Use remote version codes and production auto-increment.");
check(Boolean(app.owner), "Link the app to the owner's Expo account using eas init; Expo owner is missing.");
check(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(app.extra?.eas?.projectId || ""), "Run eas init to create/link the real EAS project; project ID is missing or invalid.");
const previousProfile = process.env.EAS_BUILD_PROFILE;
process.env.EAS_BUILD_PROFILE = "production";
try {
  createRequire(import.meta.url)(path.join(root, "apps/mobile/app.config.js"))({ config: app });
} catch (error) {
  errors.push(error.message);
} finally {
  if (previousProfile === undefined) delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE = previousProfile;
}
if (errors.length) {
  console.error("Android production preflight is blocked:");
  for (const message of errors) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log("Android production configuration preflight passed. This does not verify signing, backend health, device tests or Play Console approval.");
}
