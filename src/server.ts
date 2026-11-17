import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import type { Article, GalleryImage, Sector, Shot, SiteContent } from "./types.ts";
import {
  checkPassword,
  ensureAuth,
  getRoot,
  loadContent,
  loadMessages,
  saveContent,
  saveMessages,
  uid,
} from "./store.ts";
import { pageAbout, pageContact, pageHome, pageLegal, pageServices } from "./render.ts";
import { isLang, matchPath, type Lang, type PageId } from "./i18n.ts";
import { diffContent, loadPacks, prunePacks, savePacks, syncStructure, viewContent } from "./locale.ts";

const root = getRoot();
const sessions = new Map<string, number>();
const app = express();
const uploadDir = path.join(root, "public", "uploads");
for (const dir of [uploadDir, path.join(root, "data")]) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Vercel keeps the deployed files read-only. The public site still reads them.
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".jpg";
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Yalnızca fotoğraf yüklenebilir"));
  },
});

app.use(cookieParser("aslanlar-oturum"));
app.use(express.json({ limit: "2mb" }));
app.use("/assets", express.static(path.join(root, "assets")));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(root, "public")));

function authed(req: express.Request) {
  const token = req.cookies?.session;
  if (!token || !sessions.has(token)) return false;
  const exp = sessions.get(token) || 0;
  if (Date.now() > exp) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!authed(req)) {
    res.status(401).json({ error: "Giriş gerekli" });
    return;
  }
  next();
}

function sortInPlace<T extends { order: number }>(items: T[]) {
  items.sort((a, b) => a.order - b.order);
  items.forEach((item, index) => {
    item.order = index + 1;
  });
}

const ALIASES: Record<string, string> = {
  "/en/hakkimizda": "/en/about",
  "/en/hizmetlerimiz": "/en/services",
  "/en/iletisim": "/en/contact",
  "/en/cerez-politikasi": "/en/cookie-policy",
  "/en/gizlilik-politikasi": "/en/privacy-policy",
  "/ru/hakkimizda": "/ru/o-kompanii",
  "/ru/hizmetlerimiz": "/ru/uslugi",
  "/ru/iletisim": "/ru/kontakty",
  "/ru/cerez-politikasi": "/ru/cookie",
  "/ru/gizlilik-politikasi": "/ru/konfidencialnost",
};

function originOf(req: express.Request) {
  return `${req.protocol}://${req.get("host")}`;
}

function renderPage(content: SiteContent, lang: Lang, page: PageId, origin: string) {
  if (page === "home") return pageHome(content, lang, origin);
  if (page === "about") return pageAbout(content, lang, origin);
  if (page === "services") return pageServices(content, lang, origin);
  if (page === "contact") return pageContact(content, lang, origin);
  return pageLegal(content, lang, origin, page);
}

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const pathOnly = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;
  const alias = ALIASES[pathOnly];
  if (alias) {
    res.redirect(301, alias);
    return;
  }
  const hit = matchPath(pathOnly);
  if (!hit) return next();
  const localized = viewContent(loadContent(), hit.lang, loadPacks());
  res.type("html").send(renderPage(localized, hit.lang, hit.page, originOf(req)));
});

app.get("/admin", (_req, res) => res.sendFile(path.join(root, "public", "admin.html")));

app.post("/api/login", (req, res) => {
  const auth = ensureAuth();
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  if (username !== auth.username || !checkPassword(password, auth.password)) {
    res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı" });
    return;
  }
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, Date.now() + 1000 * 60 * 60 * 12);
  res.cookie("session", token, { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 12 });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  if (req.cookies?.session) sessions.delete(req.cookies.session);
  res.clearCookie("session");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => res.json({ ok: authed(req) }));

function langOf(value: unknown, fallback: Lang = "tr"): Lang {
  return typeof value === "string" && isLang(value) ? value : fallback;
}

app.get("/api/content", requireAuth, (req, res) => {
  const viewLang = langOf(req.query.lang);
  const content = loadContent();
  const i18n = loadPacks();
  res.json({ content, i18n, view: viewContent(content, viewLang, i18n), lang: viewLang, messages: loadMessages() });
});

app.put("/api/content", requireAuth, (req, res) => {
  const edited = req.body?.content as SiteContent;
  if (!edited?.hero || !edited.sectors || !edited.contact) {
    res.status(400).json({ error: "Eksik içerik" });
    return;
  }
  const lang = langOf(req.body?.lang);
  const viewLang = langOf(req.body?.viewLang, lang);
  const base = loadContent();
  const packs = loadPacks();
  if (lang === "tr") {
    saveContent(edited);
    savePacks(prunePacks(edited, packs));
  } else {
    packs[lang] = diffContent(base, edited);
    const next = syncStructure(base, edited);
    saveContent(next);
    savePacks(prunePacks(next, packs));
  }
  const saved = loadContent();
  const savedPacks = loadPacks();
  res.json({ content: saved, i18n: savedPacks, view: viewContent(saved, viewLang, savedPacks), lang: viewLang });
});

app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      res.status(400).json({
        error: tooBig ? "Fotoğraf 40 MB sınırını aşıyor." : err.message || "Fotoğraf yüklenemedi",
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Fotoğraf seçilmedi" });
      return;
    }
    res.json({ image: `/uploads/${req.file.filename}` });
  });
});

app.post("/api/sectors", requireAuth, (req, res) => {
  const content = loadContent();
  const body = req.body || {};
  const sector: Sector = {
    id: uid("s"),
    title: String(body.title || "Yeni alan").trim(),
    summary: String(body.summary || "").trim(),
    body: String(body.body || "").trim(),
    icon: body.icon || "plane",
    image: String(body.image || ""),
    highlight: Boolean(body.highlight),
    visible: body.visible !== false,
    order: content.sectors.length + 1,
    gallery: Array.isArray(body.gallery) ? body.gallery : [],
  };
  content.sectors.push(sector);
  saveContent(content);
  res.json({ content });
});

app.put("/api/sectors/:id", requireAuth, (req, res) => {
  const content = loadContent();
  const sector = content.sectors.find((item) => item.id === req.params.id);
  if (!sector) {
    res.status(404).json({ error: "Alan bulunamadı" });
    return;
  }
  const body = req.body || {};
  if (typeof body.title === "string") sector.title = body.title.trim();
  if (typeof body.summary === "string") sector.summary = body.summary.trim();
  if (typeof body.body === "string") sector.body = body.body.trim();
  if (typeof body.icon === "string") sector.icon = body.icon;
  if (typeof body.image === "string") sector.image = body.image;
  if (typeof body.highlight === "boolean") sector.highlight = body.highlight;
  if (typeof body.visible === "boolean") sector.visible = body.visible;
  if (Array.isArray(body.gallery)) sector.gallery = body.gallery as GalleryImage[];
  saveContent(content);
  res.json({ content });
});

app.delete("/api/sectors/:id", requireAuth, (req, res) => {
  const content = loadContent();
  content.sectors = content.sectors.filter((item) => item.id !== req.params.id);
  sortInPlace(content.sectors);
  saveContent(content);
  res.json({ content });
});

app.post("/api/sectors/reorder", requireAuth, (req, res) => {
  const ids = req.body?.ids as string[];
  const content = loadContent();
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: "Sıra listesi gerekli" });
    return;
  }
  content.sectors.forEach((sector) => {
    const index = ids.indexOf(sector.id);
    if (index >= 0) sector.order = index + 1;
  });
  sortInPlace(content.sectors);
  saveContent(content);
  res.json({ content });
});

app.post("/api/sectors/:id/gallery", requireAuth, (req, res) => {
  const content = loadContent();
  const sector = content.sectors.find((item) => item.id === req.params.id);
  if (!sector) {
    res.status(404).json({ error: "Alan bulunamadı" });
    return;
  }
  const image = String(req.body?.image || "");
  if (!image) {
    res.status(400).json({ error: "Fotoğraf gerekli" });
    return;
  }
  sector.gallery.push({
    id: uid("g"),
    image,
    caption: String(req.body?.caption || "").trim(),
    order: sector.gallery.length + 1,
  });
  saveContent(content);
  res.json({ content });
});

app.delete("/api/sectors/:id/gallery/:gid", requireAuth, (req, res) => {
  const content = loadContent();
  const sector = content.sectors.find((item) => item.id === req.params.id);
  if (!sector) {
    res.status(404).json({ error: "Alan bulunamadı" });
    return;
  }
  sector.gallery = sector.gallery.filter((item) => item.id !== req.params.gid);
  sortInPlace(sector.gallery);
  saveContent(content);
  res.json({ content });
});

app.post("/api/articles", requireAuth, (req, res) => {
  const content = loadContent();
  const article: Article = {
    id: uid("a"),
    title: String(req.body?.title || "Yeni yazı").trim(),
    body: String(req.body?.body || "").trim(),
    image: "",
    visible: req.body?.visible !== false,
    order: content.articles.length + 1,
  };
  content.articles.push(article);
  saveContent(content);
  res.json({ content });
});

app.put("/api/articles/:id", requireAuth, (req, res) => {
  const content = loadContent();
  const article = content.articles.find((item) => item.id === req.params.id);
  if (!article) {
    res.status(404).json({ error: "Yazı bulunamadı" });
    return;
  }
  if (typeof req.body?.title === "string") article.title = req.body.title.trim();
  if (typeof req.body?.body === "string") article.body = req.body.body.trim();
  if (typeof req.body?.visible === "boolean") article.visible = req.body.visible;
  saveContent(content);
  res.json({ content });
});

app.delete("/api/articles/:id", requireAuth, (req, res) => {
  const content = loadContent();
  content.articles = content.articles.filter((item) => item.id !== req.params.id);
  sortInPlace(content.articles);
  saveContent(content);
  res.json({ content });
});

app.post("/api/portfolio", requireAuth, (req, res) => {
  const content = loadContent();
  const shot: Shot = {
    id: uid("p"),
    image: String(req.body?.image || ""),
    caption: String(req.body?.caption || "").trim(),
    visible: req.body?.visible !== false,
    order: content.portfolio.length + 1,
  };
  content.portfolio.push(shot);
  saveContent(content);
  res.json({ content });
});

app.put("/api/portfolio/:id", requireAuth, (req, res) => {
  const content = loadContent();
  const shot = content.portfolio.find((item) => item.id === req.params.id);
  if (!shot) {
    res.status(404).json({ error: "Görsel bulunamadı" });
    return;
  }
  if (typeof req.body?.caption === "string") shot.caption = req.body.caption.trim();
  if (typeof req.body?.image === "string") shot.image = req.body.image;
  if (typeof req.body?.visible === "boolean") shot.visible = req.body.visible;
  saveContent(content);
  res.json({ content });
});

app.delete("/api/portfolio/:id", requireAuth, (req, res) => {
  const content = loadContent();
  content.portfolio = content.portfolio.filter((item) => item.id !== req.params.id);
  sortInPlace(content.portfolio);
  saveContent(content);
  res.json({ content });
});

app.post("/api/mesaj", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const message = String(req.body?.message || "").trim();
  if (!name || !email || !phone || !message) {
    res.status(400).json({ error: "Tüm alanlar gerekli" });
    return;
  }
  const messages = loadMessages();
  messages.unshift({ id: uid("m"), name, email, phone, message, createdAt: new Date().toISOString() });
  try {
    saveMessages(messages.slice(0, 200));
  } catch {
    res.status(503).json({ error: "Mesaj şu an kaydedilemedi." });
    return;
  }
  res.json({ ok: true });
});

app.delete("/api/mesaj/:id", requireAuth, (req, res) => {
  saveMessages(loadMessages().filter((item) => item.id !== req.params.id));
  res.json({ messages: loadMessages() });
});

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    ensureAuth();
    const file = fileURLToPath(import.meta.url);
    console.log(`Aslanlar Dış Ticaret http://localhost:${port}`);
    console.log(`Yönetim paneli http://localhost:${port}/admin`);
    console.log(`Kaynak: ${file}`);
  });
}
