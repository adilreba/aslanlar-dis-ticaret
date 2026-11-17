import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import type { Message, SiteContent } from "./types.js";
import bundledContent from "../data/content.json" with { type: "json" };

const here = path.dirname(fileURLToPath(import.meta.url));

function findRoot() {
  const candidates = [process.cwd(), path.resolve(here, ".."), path.resolve(here, "../..")];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "assets", "logo-siyah.png"))) return dir;
  }
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "data", "content.json"))) return dir;
  }
  if (process.env.VERCEL) {
    console.error(
      "content.json was not found",
      candidates.map((dir) => {
        try {
          return { dir, names: fs.readdirSync(dir) };
        } catch {
          return { dir, names: [] };
        }
      }),
    );
  }
  return path.resolve(here, "..");
}

const root = findRoot();

function file(name: string) {
  return path.join(root, "data", name);
}

function readJson<T>(name: string, fallback: T): T {
  const target = file(name);
  if (!fs.existsSync(target)) return fallback;
  return JSON.parse(fs.readFileSync(target, "utf8")) as T;
}

function writeJson(name: string, value: unknown) {
  const dir = path.join(root, "data");
  fs.mkdirSync(dir, { recursive: true });
  const target = file(name);
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, target);
}

export function getRoot() {
  return root;
}

export function loadContent(): SiteContent {
  const existing = file("content.json");
  if (!fs.existsSync(existing)) return bundledContent as SiteContent;
  return readJson<SiteContent>("content.json", bundledContent as SiteContent);
}

export function saveContent(content: SiteContent) {
  writeJson("content.json", content);
}

export function loadMessages(): Message[] {
  return readJson<Message[]>("messages.json", []);
}

export function saveMessages(messages: Message[]) {
  writeJson("messages.json", messages);
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = crypto.scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return crypto.timingSafeEqual(next, prev);
}

export function ensureAuth() {
  const auth = readJson<{ username: string; password: string } | null>("auth.json", null);
  if (auth) return auth;
  const created = { username: "admin", password: hashPassword("Aslanlar2026") };
  writeJson("auth.json", created);
  return created;
}

export function uid(prefix = "") {
  return prefix + crypto.randomBytes(8).toString("hex");
}
