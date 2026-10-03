import { config } from "dotenv";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import webpush from "web-push";

config({ path: ".env.local" });
config({ path: ".env" });

const file = ".env.local";
const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
const keys = new Set(
  existing
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.split("=")[0]),
);

function add(name, value) {
  if (keys.has(name) && process.env[name]) return false;
  const prefix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
  appendFileSync(file, `${prefix}${name}=${value}\n`);
  keys.add(name);
  return true;
}

const added = [];
if (add("AUTH_SECRET", randomBytes(32).toString("base64"))) added.push("AUTH_SECRET");
if (add("AUTH_URL", "http://localhost:3000")) added.push("AUTH_URL");
if (add("CRON_SECRET", randomBytes(32).toString("base64"))) added.push("CRON_SECRET");

if (!keys.has("VAPID_PUBLIC_KEY") || !process.env.VAPID_PUBLIC_KEY) {
  const vapid = webpush.generateVAPIDKeys();
  add("VAPID_PUBLIC_KEY", vapid.publicKey);
  add("VAPID_PRIVATE_KEY", vapid.privateKey);
  add("VAPID_SUBJECT", "mailto:rhythm@localhost");
  added.push("VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT");
}

console.log(
  added.length
    ? `Wrote ${added.length} missing keys to .env.local`
    : "Local secrets already present",
);
