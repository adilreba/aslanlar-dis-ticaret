import type { SiteContent } from "./types.js";
import { LANGS, type Lang, type PageId, pagePath, t } from "./i18n.js";

export function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paras(text: string) {
  return text
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${esc(part)}</p>`)
    .join("");
}

function icon(name: string, light = false) {
  const stroke = light ? "#fff" : "#102136";
  const paths: Record<string, string> = {
    home: `<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"/>`,
    energy: `<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/>`,
    car: `<path d="M4 15h16M6 15l1.2-4.2A2 2 0 0 1 9.1 9h5.8a2 2 0 0 1 1.9 1.8L18 15M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>`,
    ship: `<path d="M3 16.5 12 19l9-2.5M4 14l8 2 8-2M5 12c2.5 2 11.5 2 14 0 0 0 .8-4-2-6.5L12 8 7 5.5C4.2 8 5 12 5 12Z"/>`,
    plane: `<path d="M3 13 21 6l-6 14-3-6-9-1Z"/><path d="m12 14 3 4"/>`,
    chip: `<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>`,
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" aria-hidden="true">${paths[name] || paths.home}</svg>`;
}

const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="m5 12 5 5L20 7"/></svg>`;

function sorted<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

function shell(content: SiteContent, page: string, title: string, body: string, lang: Lang, origin: string, pageId: PageId) {
  const nav = [
    [pagePath(lang, "home"), t(lang, "navHome"), "home"],
    [pagePath(lang, "about"), t(lang, "navAbout"), "about"],
    [pagePath(lang, "services"), t(lang, "navServices"), "services"],
    [pagePath(lang, "contact"), t(lang, "navContact"), "contact"],
  ]
    .map(([href, label, key]) => `<a class="${page === key ? "active" : ""}" href="${href}">${label}</a>`)
    .join("");
  const langNames: Record<Lang, string> = { tr: "Türkçe", en: "English", ru: "Русский" };
  const langs = LANGS.map((code) => {
    const href = `${origin}${pagePath(code, pageId)}`;
    return `<a href="${href}" hreflang="${code}" lang="${code}" class="${code === lang ? "active" : ""}">${langNames[code]}</a>`;
  }).join("");
  const alternates = LANGS.map((code) => `<link rel="alternate" hreflang="${code}" href="${origin}${pagePath(code, pageId)}">`).join("");

  const overHero = page === "home" || page === "about" || page === "services" || page === "contact";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link rel="icon" href="/assets/logo-siyah.png">
  <link rel="canonical" href="${origin}${pagePath(lang, pageId)}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${origin}${pagePath("tr", pageId)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/site.css?v=12">
</head>
<body class="${overHero ? "has-hero" : ""}">
  <a class="skip" href="#icerik">${esc(t(lang, "skip"))}</a>
  <header class="header">
    <div class="header-inner">
      <a class="logo" href="${pagePath(lang, "home")}" aria-label="${esc(t(lang, "brand"))}"><img src="/assets/logo-siyah.png" alt="${esc(t(lang, "brand"))}"></a>
      <button class="menu-btn" type="button" aria-label="${esc(t(lang, "menu"))}" aria-expanded="false"><span></span><span></span><span></span></button>
      <nav class="nav" aria-label="Menu">${nav}</nav>
      <div class="lang">
        <button class="lang-btn" type="button" aria-label="${esc(t(lang, "language"))}" aria-expanded="false" aria-haspopup="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9s1.3-6.2 3.9-9Z"/></svg>
        </button>
        <div class="lang-menu">${langs}</div>
      </div>
      <a class="nav-cta" href="${pagePath(lang, "contact")}">${esc(t(lang, "contactCta"))}</a>
    </div>
  </header>
  <main id="icerik">${body}</main>
  ${footer(content, lang)}
  <script src="/js/site.js?v=4"></script>
</body>
</html>`;
}

function footer(content: SiteContent, lang: Lang) {
  const areas = [
    ["insaat", "areaConstruction"],
    ["enerji", "areaEnergy"],
    ["elektrik", "areaElectric"],
  ]
    .map(([id, key]) => `<li><a href="${pagePath(lang, "services")}#${id}">${esc(t(lang, key))}</a></li>`)
    .join("");
  return `<footer class="footer">
    <div class="footer-grid">
      <div>
        <h3>${esc(t(lang, "brand"))}</h3>
        <p>${esc(content.footer.blurb)}</p>
        <p class="contact-line"><span class="round-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></span><span><b>${esc(t(lang, "email"))}</b><a href="mailto:${esc(content.contact.email)}">${esc(content.contact.email)}</a></span></p>
        <p class="contact-line"><span class="round-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.2"/></svg></span><span><b>${esc(t(lang, "address"))}</b>${esc(content.contact.address)}</span></p>
      </div>
      <div>
        <h3>${esc(t(lang, "quick"))}</h3>
        <ul>
          <li><a href="${pagePath(lang, "about")}">${esc(t(lang, "aboutBtn"))}</a></li>
          <li><a href="${pagePath(lang, "services")}">${esc(t(lang, "servicesBtn"))}</a></li>
          <li><a href="${pagePath(lang, "contact")}">${esc(t(lang, "footerContact"))}</a></li>
        </ul>
        <h3>${esc(t(lang, "vision"))}</h3>
        <p>${esc(content.footer.vision)}</p>
      </div>
      <div>
        <h3>${esc(t(lang, "areas"))}</h3>
        <ul>${areas}</ul>
        <h3>${esc(t(lang, "mission"))}</h3>
        <p>${esc(content.footer.mission)}</p>
      </div>
      <div>
        <h3>${esc(t(lang, "corporate"))}</h3>
        <ul>
          <li><a href="${pagePath(lang, "cookies")}">${esc(t(lang, "cookies"))}</a></li>
          <li><a href="${pagePath(lang, "privacy")}">${esc(t(lang, "privacy"))}</a></li>
        </ul>
        <h3>${esc(t(lang, "reach"))}</h3>
        <p>${esc(content.footer.reach)}</p>
      </div>
    </div>
    <div class="footer-bar">
      <p>Copyright © 2026 - ${esc(t(lang, "brand"))}</p>
      <div class="socials" aria-label="Social">
        <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1Z"/></svg></a>
        <a href="#" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.7 10.3 22 2h-2.2l-6.1 7L8.7 2H2l7.8 11.1L2.4 22H4.6l6.6-7.6L15.6 22H22l-7.3-11.7Zm-2.3 2.7-.8-1.1L5.1 3.6h2.6l4.3 6.2.8 1.1 6.3 9H16.5l-4.1-5.9Z"/></svg></a>
        <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg></a>
        <a href="#" aria-label="Dribbble"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M5 9.5c3.5 1 7.5 1 11.5-.5M8 19c1.5-3 3-6.5 3.5-10M15.5 18.5c-1-2.5-1.2-5.5-.5-9"/></svg></a>
        <a href="#" aria-label="Slack"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 3a1.7 1.7 0 0 0-1.7 1.7v3.1H5.2A1.7 1.7 0 0 0 3.5 9.5 1.7 1.7 0 0 0 5.2 11.2h1.6v.3H5.2A1.7 1.7 0 0 0 3.5 13.2a1.7 1.7 0 0 0 1.7 1.7h1.6v3.1A1.7 1.7 0 0 0 8.5 19.7 1.7 1.7 0 0 0 10.2 18v-3.1h.3v3.1a1.7 1.7 0 0 0 1.7 1.7 1.7 1.7 0 0 0 1.7-1.7v-3.1h1.6a1.7 1.7 0 0 0 1.7-1.7 1.7 1.7 0 0 0-1.7-1.7h-1.6v-.3h1.6A1.7 1.7 0 0 0 17.9 8a1.7 1.7 0 0 0-1.7-1.7h-1.6V3.2A1.7 1.7 0 0 0 12.9 1.5 1.7 1.7 0 0 0 11.2 3.2v3.1h-.3V3.2A1.7 1.7 0 0 0 9.2 1.5 1.7 1.7 0 0 0 8.5 3Z"/></svg></a>
      </div>
    </div>
  </footer>`;
}

export function pageHome(content: SiteContent, lang: Lang, origin: string) {
  const sectors = sorted(content.sectors).filter((s) => s.visible);
  const cards = sectors
    .map((sector) => {
      const media = sector.image
        ? `<img class="card-photo" src="${esc(sector.image)}" alt="${esc(sector.title)}">`
        : icon(sector.icon, sector.highlight);
      return `<a class="card${sector.highlight ? " highlight" : ""}" href="${pagePath(lang, "services")}#${esc(sector.id)}">
        ${media}
        <h3>${esc(sector.title)}</h3>
        <p>${esc(sector.summary)}</p>
      </a>`;
    })
    .join("");

  const features = sorted(content.quality.features)
    .map(
      (item) => `<article class="feature">
        <span class="check">${check}</span>
        <div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div>
      </article>`
    )
    .join("");

  const shots = sorted(content.portfolio)
    .filter((shot) => shot.visible)
    .map(
      (shot) => `<article class="shot"><img src="${esc(shot.image)}" alt=""><p>${esc(shot.caption)}</p></article>`
    )
    .join("");

  const items = sorted(content.expertise.items)
    .map((item) => `<li><span class="tick">${check}</span>${esc(item.label)}</li>`)
    .join("");

  const galleries = sectors
    .filter((sector) => sector.gallery.length)
    .map((sector) => {
      const photos = sorted(sector.gallery)
        .map(
          (photo) => `<article class="shot"><img src="${esc(photo.image)}" alt="${esc(photo.caption)}"><p>${esc(photo.caption)}</p></article>`
        )
        .join("");
      return `<section class="section">
        <div class="wrap">
          <h2>${esc(sector.title)}</h2>
          <p class="lead left">${esc(sector.summary)}</p>
          <div class="shots gallery">${photos}</div>
        </div>
      </section>`;
    })
    .join("");

  const body = `
    <section class="hero" style="background-image:linear-gradient(90deg,rgba(16,36,64,.62),rgba(28,58,96,.42)),url('${esc(content.hero.image)}')">
      <div class="hero-inner">
        <p class="eyebrow">${esc(content.hero.eyebrow)}</p>
        <h1>${esc(content.hero.title)}</h1>
        <p>${esc(content.hero.text)}</p>
        <div class="hero-actions">
          <a class="btn btn-dark" href="${pagePath(lang, "about")}">${esc(t(lang, "aboutBtn"))}</a>
          <a class="btn btn-ghost" href="${pagePath(lang, "services")}">${esc(t(lang, "servicesBtn"))}</a>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="wrap center">
        <h2>${esc(t(lang, "solutionsTitle"))}</h2>
        <p class="lead">${esc(t(lang, "solutionsLead"))}</p>
        <div class="cards">${cards}</div>
      </div>
    </section>
    <section class="section quality">
      <div class="wrap quality-grid">
        <img src="${esc(content.quality.image)}" alt="${esc(t(lang, "qualityAlt"))}">
        <div>
          <p class="kicker">${esc(content.quality.kicker)}</p>
          <h2>${esc(content.quality.title)}</h2>
          <p>${esc(content.quality.text)}</p>
          <div class="features">${features}</div>
        </div>
      </div>
    </section>
    <section class="section portfolio">
      <div class="wrap"><div class="shots">${shots}</div></div>
    </section>
    ${galleries}
    <section class="section expert-wrap">
      <div class="wrap expert">
        <img src="${esc(content.expertise.image)}" alt="${esc(t(lang, "expertiseAlt"))}">
        <div>
          <h2>${esc(content.expertise.title)}</h2>
          <p>${esc(content.expertise.text)}</p>
          <ul class="ticks">${items}</ul>
        </div>
      </div>
    </section>`;

  return shell(content, "home", t(lang, "pageHome"), body, lang, origin, "home");
}

export function pageAbout(content: SiteContent, lang: Lang, origin: string) {
  const image = content.about.image || "/assets/an3.png";
  const body = `
    <section class="hero page-hero" style="background-image:linear-gradient(90deg,rgba(16,36,64,.62),rgba(28,58,96,.42)),url('${esc(content.hero.image)}')">
      <div class="hero-inner">
        <p class="eyebrow">${esc(content.about.eyebrow)}</p>
        <h1>${esc(content.about.title)}</h1>
        <p>${esc(content.about.lead)}</p>
      </div>
    </section>
    <section class="section about-copy">
      <div class="wrap">
        <h2>${esc(content.about.heading)}</h2>
        ${paras(content.about.body)}
      </div>
    </section>
    <section class="section about-goals">
      <div class="wrap goals">
        <img src="${esc(image)}" alt="${esc(t(lang, "aboutAlt"))}">
        <div>
          <h2>${esc(content.about.goalsTitle)}</h2>
          <div class="goals-grid">
            <div>
              <h3>${esc(content.about.visionTitle)}</h3>
              <p>${esc(content.about.vision)}</p>
            </div>
            <div>
              <h3>${esc(content.about.missionTitle)}</h3>
              <p>${esc(content.about.mission)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  return shell(content, "about", t(lang, "pageAbout"), body, lang, origin, "about");
}

export function pageServices(content: SiteContent, lang: Lang, origin: string) {
  const articles = sorted(content.articles).filter((item) => item.visible);
  const blocks = articles
    .map((article) => {
      const photo = article.image ? `<img src="${esc(article.image)}" alt="${esc(article.title)}">` : "";
      return `<article class="service-row" id="${esc(article.id)}">${photo}<div><h2>${esc(article.title)}</h2>${paras(article.body)}</div></article>`;
    })
    .join("");

  const body = `
    <section class="hero page-hero" style="background-image:linear-gradient(90deg,rgba(16,36,64,.62),rgba(28,58,96,.42)),url('${esc(content.hero.image)}')">
      <div class="hero-inner">
        <p class="eyebrow">${esc(t(lang, "servicesEyebrow"))}</p>
        <h1>${esc(t(lang, "servicesTitle"))}</h1>
        <p>${esc(t(lang, "servicesLead"))}</p>
      </div>
    </section>
    <section class="section services"><div class="wrap">${blocks}</div></section>`;
  return shell(content, "services", t(lang, "pageServices"), body, lang, origin, "services");
}

export function pageContact(content: SiteContent, lang: Lang, origin: string) {
  const image = content.contact.image || "/uploads/cotna1.webp";
  const pin = `<svg viewBox="0 0 576 512" aria-hidden="true"><path d="M288 0c-69.6 0-126 56.4-126 126 0 56.3 82.4 158.8 113.9 196 6.4 7.5 17.8 7.5 24.2 0C331.6 284.8 414 182.3 414 126 414 56.4 357.6 0 288 0zm0 168c-23.2 0-42-18.8-42-42s18.8-42 42-42 42 18.8 42 42-18.8 42-42 42z"/></svg>`;
  const mail = `<svg viewBox="0 0 512 512" aria-hidden="true"><path d="M502.3 190.8c3.9-3.1 9.7-.2 9.7 4.7V400c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V195.6c0-5 5.7-7.8 9.7-4.7 22.4 17.4 52.1 39.5 154.1 113.6 21.1 15.4 56.7 47.8 92.2 47.6 35.7.3 72-32.8 92.3-47.6 102-74.1 131.6-96.3 154-113.7zM256 320c23.2.4 56.6-29.2 73.4-41.4 132.7-96.3 142.8-104.7 173.4-128.7 5.8-4.5 9.2-11.5 9.2-18.9v-19c0-26.5-21.5-48-48-48H48C21.5 64 0 85.5 0 112v19c0 7.4 3.4 14.3 9.2 18.9 30.6 23.9 40.7 32.4 173.4 128.7 16.8 12.2 50.2 41.8 73.4 41.4z"/></svg>`;
  const body = `
    <section class="hero contact-hero" style="background-image:linear-gradient(rgba(78,148,162,.5),rgba(78,148,162,.5)),url('${esc(image)}')">
      <div class="hero-inner">
        <h1>${esc(content.contact.title)}</h1>
        <p>${esc(content.contact.text)}</p>
      </div>
    </section>
    <section class="section reach-wrap">
      <div class="wrap reach">
        <article class="reach-card">
          <span class="reach-icon">${pin}</span>
          <h3>${esc(t(lang, "address"))}</h3>
          <p>${esc(content.contact.address)}</p>
        </article>
        <article class="reach-card">
          <span class="reach-icon">${mail}</span>
          <h3>${esc(t(lang, "email"))}</h3>
          <p><a href="mailto:${esc(content.contact.email)}">${esc(content.contact.email)}</a></p>
        </article>
      </div>
    </section>
    <section class="section form-wrap">
      <div class="form-intro">
        <h2>${esc(content.contact.formTitle)}</h2>
        <p>${esc(content.contact.formText)}</p>
      </div>
      <form class="line-form" id="contact-form" data-error="${esc(t(lang, "formError"))}">
        <div class="form-success" role="status">${esc(t(lang, "formOk"))}</div>
        <label for="name">${esc(t(lang, "name"))} <span>*</span></label>
        <input id="name" name="name" required autocomplete="name">
        <label for="email">${esc(t(lang, "emailField"))} <span>*</span></label>
        <input id="email" name="email" type="email" required autocomplete="email">
        <label for="phone">${esc(t(lang, "phone"))} <span>*</span></label>
        <input id="phone" name="phone" type="tel" required autocomplete="tel">
        <label for="message">${esc(t(lang, "message"))} <span>*</span></label>
        <textarea id="message" name="message" required></textarea>
        <button class="btn btn-purple" type="submit">${esc(t(lang, "send"))}</button>
      </form>
    </section>`;
  return shell(content, "contact", t(lang, "pageContact"), body, lang, origin, "contact");
}

export function pageLegal(content: SiteContent, lang: Lang, origin: string, kind: "cookies" | "privacy") {
  const title = t(lang, kind === "cookies" ? "cookies" : "privacy");
  const text = kind === "cookies" ? content.legal.cookies : content.legal.privacy;
  const body = `<section class="section legal"><div class="prose"><h2>${esc(title)}</h2>${paras(text)}</div></section>`;
  return shell(content, kind, t(lang, kind === "cookies" ? "pageCookies" : "pagePrivacy"), body, lang, origin, kind);
}
