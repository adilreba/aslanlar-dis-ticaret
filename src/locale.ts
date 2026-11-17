import type { SiteContent } from "./types.js";
import type { Lang } from "./i18n.js";
import { getRoot } from "./store.js";
import bundledPacks from "../data/i18n.json" with { type: "json" };
import fs from "fs";
import path from "path";

export type LocalePacks = { en: unknown; ru: unknown };

const EMPTY: LocalePacks = { en: {}, ru: {} };

function file() {
  return path.join(getRoot(), "data", "i18n.json");
}

export function loadPacks(): LocalePacks {
  const target = file();
  if (!fs.existsSync(target)) {
    return { en: bundledPacks.en || {}, ru: bundledPacks.ru || {} };
  }
  const parsed = JSON.parse(fs.readFileSync(target, "utf8")) as Partial<LocalePacks>;
  return { en: parsed.en || {}, ru: parsed.ru || {} };
}

export function savePacks(packs: LocalePacks) {
  const target = file();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(packs, null, 2));
  fs.renameSync(temp, target);
}

export function applyLocale(content: SiteContent, pack: unknown): SiteContent {
  const copy = structuredClone(content);
  overlay(copy, pack);
  return copy;
}

function overlay(target: any, patch: any) {
  if (!patch || typeof patch !== "object" || !target) return;
  if (Array.isArray(target)) {
    if (!Array.isArray(patch)) return;
    for (const item of patch) {
      if (!item || typeof item !== "object" || typeof item.id !== "string") continue;
      const found = target.find((entry) => entry && entry.id === item.id);
      if (found) overlay(found, item);
    }
    return;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (key === "id" || value == null) continue;
    if (typeof value === "string") {
      if (value.trim() && typeof target[key] === "string") target[key] = value;
    } else if (typeof value === "object") {
      overlay(target[key], value);
    }
  }
}

function textDiff(base: any, edited: any, keys: string[]) {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = edited?.[key];
    if (typeof value === "string" && value.trim() && value !== base?.[key]) out[key] = value;
  }
  return out;
}

function listDiff(base: any[] = [], edited: any[] = [], keys: string[], nested?: (baseItem: any, editedItem: any) => Record<string, unknown>) {
  const items = [];
  for (const item of edited) {
    if (!item?.id) continue;
    const prev = base.find((entry) => entry?.id === item.id) || {};
    const diff: Record<string, unknown> = { id: item.id, ...textDiff(prev, item, keys) };
    if (nested) Object.assign(diff, nested(prev, item));
    if (Object.keys(diff).length > 1) items.push(diff);
  }
  return items;
}

export function diffContent(base: SiteContent, edited: SiteContent) {
  const hero = textDiff(base.hero, edited.hero, ["eyebrow", "title", "text"]);
  const quality = textDiff(base.quality, edited.quality, ["kicker", "title", "text"]);
  const features = listDiff(base.quality.features, edited.quality.features, ["title", "text"]);
  const expertise = textDiff(base.expertise, edited.expertise, ["title", "text"]);
  const items = listDiff(base.expertise.items, edited.expertise.items, ["label"]);
  const about = textDiff(base.about, edited.about, ["eyebrow", "title", "lead", "heading", "body", "goalsTitle", "visionTitle", "vision", "missionTitle", "mission"]);
  const contact = textDiff(base.contact, edited.contact, ["eyebrow", "title", "text", "address", "formTitle", "formText"]);
  const footer = textDiff(base.footer, edited.footer, ["blurb", "vision", "mission", "reach"]);
  const legal = textDiff(base.legal, edited.legal, ["cookies", "privacy"]);
  const sectors = listDiff(base.sectors, edited.sectors, ["title", "summary", "body"], (prev, item) => {
    const gallery = listDiff(prev.gallery || [], item.gallery || [], ["caption"]);
    return gallery.length ? { gallery } : {};
  });
  const articles = listDiff(base.articles, edited.articles, ["title", "body"]);
  const portfolio = listDiff(base.portfolio, edited.portfolio, ["caption"]);
  const out: Record<string, unknown> = {};
  if (Object.keys(hero).length) out.hero = hero;
  if (Object.keys(quality).length || features.length) out.quality = { ...quality, ...(features.length ? { features } : {}) };
  if (Object.keys(expertise).length || items.length) out.expertise = { ...expertise, ...(items.length ? { items } : {}) };
  if (Object.keys(about).length) out.about = about;
  if (Object.keys(contact).length) out.contact = contact;
  if (Object.keys(footer).length) out.footer = footer;
  if (Object.keys(legal).length) out.legal = legal;
  if (sectors.length) out.sectors = sectors;
  if (articles.length) out.articles = articles;
  if (portfolio.length) out.portfolio = portfolio;
  return out;
}

function syncList<T extends { id: string; order: number }>(baseItems: T[], editedItems: T[], textKeys: string[], nest?: (prev: any, edited: any, next: any) => void) {
  return editedItems.map((edited, index) => {
    const prev = baseItems.find((item) => item.id === edited.id);
    const next: any = prev ? structuredClone(prev) : structuredClone(edited);
    for (const [key, value] of Object.entries(edited)) {
      if (textKeys.includes(key) || key === "id" || key === "order") continue;
      if (nest && (key === "gallery" || key === "features" || key === "items")) continue;
      next[key] = structuredClone(value);
    }
    if (nest) nest(prev, edited, next);
    next.order = typeof edited.order === "number" ? edited.order : index + 1;
    return next as T;
  });
}

export function syncStructure(base: SiteContent, edited: SiteContent): SiteContent {
  const next = structuredClone(base);
  next.hero.image = edited.hero.image;
  next.quality.image = edited.quality.image;
  next.quality.features = syncList(base.quality.features, edited.quality.features, ["title", "text"]);
  next.expertise.image = edited.expertise.image;
  next.expertise.items = syncList(base.expertise.items, edited.expertise.items, ["label"]);
  next.about.image = edited.about.image;
  next.contact.image = edited.contact.image;
  next.contact.email = edited.contact.email;
  next.sectors = syncList(base.sectors, edited.sectors, ["title", "summary", "body"], (prev, item, target) => {
    target.gallery = syncList(prev?.gallery || [], item.gallery || [], ["caption"]);
  });
  next.articles = syncList(base.articles, edited.articles, ["title", "body"]);
  next.portfolio = syncList(base.portfolio, edited.portfolio, ["caption"]);
  return next;
}

function pruneValue(base: any, pack: any): any {
  if (!pack || typeof pack !== "object") return undefined;
  if (Array.isArray(pack)) {
    if (!Array.isArray(base)) return [];
    return pack
      .map((item) => {
        if (!item || typeof item !== "object" || typeof item.id !== "string") return null;
        const found = base.find((entry) => entry && entry.id === item.id);
        if (!found) return null;
        return pruneValue(found, item);
      })
      .filter((item) => item && Object.keys(item).length > 1);
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pack)) {
    if (key === "id") {
      out.id = value;
      continue;
    }
    if (typeof value === "string") {
      if (value.trim() && value !== base?.[key]) out[key] = value;
    } else if (value && typeof value === "object") {
      const nested = pruneValue(base?.[key], value);
      const keep = Array.isArray(nested) ? nested.length > 0 : nested && Object.keys(nested).length > 0;
      if (keep) out[key] = nested;
    }
  }
  return out;
}

export function prunePacks(base: SiteContent, packs: LocalePacks): LocalePacks {
  return {
    en: pruneValue(base, packs.en) || {},
    ru: pruneValue(base, packs.ru) || {},
  };
}

export function viewContent(content: SiteContent, lang: Lang, packs: LocalePacks) {
  if (lang === "tr") return content;
  return applyLocale(content, lang === "en" ? packs.en : packs.ru);
}

export function emptyPacks(): LocalePacks {
  return structuredClone(EMPTY);
}
