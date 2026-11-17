const login = document.querySelector("#login");
const app = document.querySelector("#app");
const view = document.querySelector("#view");
const titleEl = document.querySelector("#title");
const crumbEl = document.querySelector("#crumb");
let content = null;
let messages = [];
const savedLang = localStorage.getItem("admin-lang");
const state = {
  tab: "home",
  textPage: "home",
  sectorId: "",
  articleId: "",
  messageId: "",
  creating: "",
  lang: savedLang === "en" || savedLang === "ru" ? savedLang : "tr",
};

const icons = [
  ["home", "İnşaat"],
  ["energy", "Enerji"],
  ["car", "Otomotiv"],
  ["ship", "Lojistik"],
  ["plane", "Havacılık"],
  ["chip", "Elektronik"],
];

const pages = {
  home: ["Özet", "Sitenin genel durumu"],
  sectors: ["Alanlar", "Ana sayfadaki kartlar"],
  articles: ["Hizmetler", "Hizmetler sayfasındaki bölümler"],
  texts: ["Sayfalar", "Yazı ve kapak fotoğrafları"],
  gallery: ["Galeri", "Ana sayfadaki koyu bant"],
  messages: ["Mesajlar", "İletişim formundan gelenler"],
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "İşlem başarısız");
  return data;
}

function toast(message, kind = "ok") {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.className = "toast show" + (kind === "bad" ? " bad" : "");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.className = "toast"; }, 2400);
}

function siteHome() {
  if (state.lang === "en") return "/en";
  if (state.lang === "ru") return "/ru";
  return "/";
}

async function save(message = "Kaydedildi", options = {}) {
  const data = await api("/api/content", {
    method: "PUT",
    body: JSON.stringify({ lang: state.lang, viewLang: state.lang, content }),
  });
  content = data.view;
  if (!options.quiet) toast(message);
  if (!options.keep) render();
}

async function upload(file) {
  try {
    const body = new FormData();
    body.append("image", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.image) {
      toast(data.error || "Fotoğraf yüklenemedi", "bad");
      return "";
    }
    return data.image;
  } catch {
    toast("Fotoğraf yüklenemedi", "bad");
    return "";
  }
}

function field(label, value, attrs = "") {
  const multiline = attrs.includes("textarea");
  const control = multiline
    ? `<textarea ${attrs.replace("textarea", "")}>${escapeHtml(value || "")}</textarea>`
    : `<input ${attrs} value="${escapeHtml(value || "")}">`;
  return `<div class="field"><label>${escapeHtml(label)}</label>${control}</div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function when(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function sorted(list) {
  return [...list].sort((a, b) => a.order - b.order);
}

async function moveItem(list, fromId, toId) {
  const items = sorted(list);
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return;
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  items.forEach((entry, index) => { entry.order = index + 1; });
  await save("Sıra güncellendi");
}

function bindDrag(list) {
  let fromId = "";
  view.querySelectorAll("[data-drag]").forEach((row) => {
    const grip = row.querySelector(".grip");
    if (!grip) return;
    grip.addEventListener("dragstart", (event) => {
      fromId = row.dataset.drag;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", fromId);
      row.classList.add("dragging");
    });
    grip.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      row.classList.add("over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("over"));
    row.addEventListener("drop", async (event) => {
      event.preventDefault();
      row.classList.remove("over");
      await moveItem(list, event.dataTransfer.getData("text/plain") || fromId, row.dataset.drag);
    });
  });
}

function fileButton(label, action) {
  return `<label class="file">${label}<input type="file" accept="image/*" data-act="${action}"></label>`;
}

function render() {
  const [heading, crumb] = pages[state.tab];
  titleEl.textContent = heading;
  crumbEl.textContent = crumb;
  const names = { tr: "Türkçe", en: "English", ru: "Русский" };
  document.querySelector("#lang").value = state.lang;
  document.querySelector("#open-site").href = siteHome();
  document.querySelector("#lang-note").textContent = state.lang === "tr"
    ? "Türkçe yazılar kaydedilir. Fotoğraf, sıra ve görünürlük tüm dillerde ortaktır."
    : `${names[state.lang]} yazıları kaydedilir. Fotoğraf, sıra ve görünürlük tüm dillerde ortaktır.`;
  document.querySelectorAll("aside [data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.tab);
  });
  const counts = {
    sectors: content.sectors.filter((item) => item.visible).length,
    articles: content.articles.filter((item) => item.visible).length,
    gallery: content.portfolio.filter((item) => item.visible).length,
    messages: messages.length,
  };
  document.querySelectorAll("[data-count]").forEach((badge) => {
    const count = counts[badge.dataset.count] || 0;
    badge.textContent = count;
    badge.hidden = count === 0;
  });
  if (state.tab === "home") renderHome();
  else if (state.tab === "sectors") renderSectors();
  else if (state.tab === "articles") renderArticles();
  else if (state.tab === "texts") renderTexts();
  else if (state.tab === "gallery") renderGallery();
  else renderMessages();
}

function renderHome() {
  const visibleSectors = content.sectors.filter((item) => item.visible).length;
  const latest = [...messages].slice(0, 4);
  view.innerHTML = `
    <div class="stats">
      <article class="stat"><span>Görünen alan</span><b>${visibleSectors}</b><small>${content.sectors.length} kayıt</small></article>
      <article class="stat"><span>Hizmet bölümü</span><b>${content.articles.filter((item) => item.visible).length}</b><small>${content.articles.length} yazı</small></article>
      <article class="stat"><span>Galeri</span><b>${content.portfolio.filter((item) => item.visible).length}</b><small>koyu bant</small></article>
      <article class="stat"><span>Mesaj</span><b>${messages.length}</b><small>iletişim formu</small></article>
    </div>
    <article class="card">
      <h2>Son mesajlar</h2>
      ${latest.length ? latest.map((item) => `<div class="msg-line"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.email)}</span></div><span>${escapeHtml(when(item.createdAt))}</span></div>`).join("") : `<p class="empty">Henüz mesaj yok.</p>`}
    </article>`;
}

function renderSectors() {
  const items = sorted(content.sectors);
  if (!state.creating && !items.some((item) => item.id === state.sectorId)) state.sectorId = items[0]?.id || "";
  const current = state.creating ? null : items.find((item) => item.id === state.sectorId);
  view.innerHTML = `
    <div class="workspace">
      <div class="list">
        <div class="list-head">
          <input id="filter" placeholder="Alan ara" aria-label="Alan ara">
          <button type="button" class="primary" id="create">Yeni</button>
        </div>
        <div class="rows">
        ${items.map((sector) => `<div class="row-item ${!state.creating && sector.id === state.sectorId ? "active" : ""}" data-drag="${sector.id}" data-name="${escapeHtml(sector.title.toLocaleLowerCase("tr"))}">
          <span class="grip" draggable="true" title="Sırayı değiştir">⋮⋮</span>
          <button type="button" class="pick" data-pick="${sector.id}">
            ${sector.image ? `<img src="${escapeHtml(sector.image)}" alt="">` : `<span class="mark">${escapeHtml(sector.title.slice(0, 1))}</span>`}
            <span><strong>${escapeHtml(sector.title)}</strong><small>${sector.visible ? "Sitede" : "Gizli"}${sector.highlight ? " · mor" : ""}</small></span>
          </button>
        </div>`).join("") || `<p class="empty">Henüz alan yok.</p>`}
        </div>
      </div>
      <div class="editor">${current ? sectorEditor(current) : newSectorForm()}</div>
    </div>`;
  bindFilter();
  bindDrag(content.sectors);
  view.querySelector("#create").addEventListener("click", () => { state.creating = "sector"; render(); });
  view.querySelectorAll("[data-pick]").forEach((button) => {
    button.addEventListener("click", () => { state.creating = ""; state.sectorId = button.dataset.pick; render(); });
  });
  if (current) bindSector(current.id);
  else bindNewSector();
}

function newSectorForm() {
  return `<h2>Yeni alan</h2>
    <p class="muted">Başlık ana sayfa kartında görünür. Uzun yazı hizmetler sayfasına da eklenebilir.</p>
    <form id="new-sector">
      ${field("Başlık", "", 'name="title" required placeholder="Uzay Havacılık"')}
      ${field("Kısa yazı", "", 'textarea name="summary" placeholder="Kartta görünecek metin"')}
      ${field("Uzun yazı", "", 'textarea name="body" placeholder="İsterseniz hizmet metni"')}
      <label>Simge</label>
      <select name="icon">${icons.map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select>
      <div class="actions"><button class="primary" type="submit">Alanı oluştur</button></div>
    </form>`;
}

function sectorEditor(sector) {
  const gallery = sorted(sector.gallery);
  return `<div class="actions" style="margin-top:0">
      <span class="badge ${sector.visible ? "" : "off"}">${sector.visible ? "Sitede" : "Gizli"}</span>
      ${sector.highlight ? `<span class="badge hot">Mor kart</span>` : ""}
      <span style="flex:1"></span>
      <button type="button" class="ghost" data-act="hide">${sector.visible ? "Gizle" : "Göster"}</button>
      <button type="button" class="danger" data-act="delete">Sil</button>
    </div>
    <p class="muted">Sırayı üstteki karttan tutamacı sürükleyerek değiştirin.</p>
    ${sector.image ? `<img class="cover" src="${escapeHtml(sector.image)}" alt="">` : ""}
    ${fileButton(sector.image ? "Kapağı değiştir" : "Kapak ekle", "cover")}
    <div class="split">
      ${field("Başlık", sector.title, 'data-key="title"')}
      <div>
        <label>Simge</label>
        <select data-key="icon">${icons.map(([id, name]) => `<option value="${id}" ${sector.icon === id ? "selected" : ""}>${name}</option>`).join("")}</select>
      </div>
    </div>
    ${field("Kısa yazı", sector.summary, 'textarea data-key="summary"')}
    ${field("Uzun yazı", sector.body, 'textarea data-key="body"')}
    <label class="switch"><input type="checkbox" data-key="highlight" ${sector.highlight ? "checked" : ""}> Ana sayfada mor vurgu kartı olsun</label>
    <h2>Ek fotoğraflar</h2>
    <div class="gallery">
      ${gallery.map((photo) => `<figure>
        <img src="${escapeHtml(photo.image)}" alt="">
        <button type="button" class="x" data-del-photo="${photo.id}" aria-label="Kaldır">×</button>
        <input data-cap="${photo.id}" value="${escapeHtml(photo.caption)}" aria-label="Fotoğraf yazısı">
      </figure>`).join("")}
    </div>
    <div class="split">
      ${field("Yeni fotoğrafın yazısı", "", 'data-new-cap placeholder="Su-57"')}
      <div>${fileButton("Fotoğraf ekle", "add-photo")}</div>
    </div>
    <div class="actions"><button type="button" class="primary" data-act="save">Değişiklikleri kaydet</button></div>`;
}

function bindFilter() {
  const input = view.querySelector("#filter");
  if (!input) return;
  input.addEventListener("input", () => {
    const query = input.value.trim().toLocaleLowerCase("tr");
    view.querySelectorAll(".row-item").forEach((item) => {
      item.hidden = query && !item.dataset.name.includes(query);
    });
  });
}

function bindNewSector() {
  view.querySelector("#new-sector").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const id = "s" + Date.now();
    content.sectors.push({
      id, title: data.title, summary: data.summary, body: data.body, icon: data.icon,
      image: "", highlight: false, visible: true, order: content.sectors.length + 1, gallery: [],
    });
    state.creating = "";
    state.sectorId = id;
    await save("Alan eklendi");
  });
}

function bindSector(id) {
  const card = view.querySelector(".editor");
  const sector = () => content.sectors.find((item) => item.id === id);
  card.querySelector('[data-act="save"]').addEventListener("click", async () => {
    const item = sector();
    card.querySelectorAll("[data-key]").forEach((input) => {
      item[input.dataset.key] = input.type === "checkbox" ? input.checked : input.value;
    });
    card.querySelectorAll("[data-cap]").forEach((input) => {
      const photo = item.gallery.find((entry) => entry.id === input.dataset.cap);
      if (photo) photo.caption = input.value;
    });
    await save();
  });
  card.querySelector('[data-act="hide"]').addEventListener("click", async () => {
    sector().visible = !sector().visible;
    await save(sector().visible ? "Alan gösterildi" : "Alan gizlendi");
  });
  card.querySelector('[data-act="delete"]').addEventListener("click", async () => {
    if (!confirm("Bu alan silinsin mi?")) return;
    content.sectors = content.sectors.filter((item) => item.id !== id);
    state.sectorId = "";
    await save("Alan silindi");
  });
  card.querySelector('[data-act="cover"]').addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = await upload(file);
    if (!image) return;
    sector().image = image;
    await save("Kapak güncellendi");
  });
  card.querySelector('[data-act="add-photo"]').addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = await upload(file);
    if (!image) return;
    const caption = card.querySelector("[data-new-cap]").value || file.name;
    sector().gallery.push({ id: "g" + Date.now(), image, caption, order: sector().gallery.length + 1 });
    await save("Fotoğraf eklendi");
  });
  card.querySelectorAll("[data-del-photo]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = sector();
      item.gallery = item.gallery.filter((photo) => photo.id !== button.dataset.delPhoto);
      await save("Fotoğraf kaldırıldı");
    });
  });
}

function renderArticles() {
  const items = sorted(content.articles);
  if (!state.creating && !items.some((item) => item.id === state.articleId)) state.articleId = items[0]?.id || "";
  const current = state.creating ? null : items.find((item) => item.id === state.articleId);
  view.innerHTML = `
    <div class="workspace">
      <div class="list">
        <div class="list-head">
          <input id="filter" placeholder="Hizmet ara" aria-label="Hizmet ara">
          <button type="button" class="primary" id="create">Yeni</button>
        </div>
        <div class="rows">
        ${items.map((article) => `<div class="row-item ${!state.creating && article.id === state.articleId ? "active" : ""}" data-drag="${article.id}" data-name="${escapeHtml(article.title.toLocaleLowerCase("tr"))}">
          <span class="grip" draggable="true" title="Sırayı değiştir">⋮⋮</span>
          <button type="button" class="pick" data-pick="${article.id}">
            ${article.image ? `<img src="${escapeHtml(article.image)}" alt="">` : `<span class="mark">${escapeHtml(article.title.slice(0, 1))}</span>`}
            <span><strong>${escapeHtml(article.title)}</strong><small>${article.visible ? "Sitede" : "Gizli"}</small></span>
          </button>
        </div>`).join("")}
        </div>
      </div>
      <div class="editor">${current ? articleEditor(current) : newArticleForm()}</div>
    </div>`;
  bindFilter();
  bindDrag(content.articles);
  view.querySelector("#create").addEventListener("click", () => { state.creating = "article"; render(); });
  view.querySelectorAll("[data-pick]").forEach((button) => {
    button.addEventListener("click", () => { state.creating = ""; state.articleId = button.dataset.pick; render(); });
  });
  if (current) bindArticle(current.id);
  else bindNewArticle();
}

function newArticleForm() {
  return `<h2>Yeni hizmet bölümü</h2>
    <p class="muted">Fotoğraf solda, başlık ve yazı sağda görünür.</p>
    <form id="new-article">
      ${field("Başlık", "", 'name="title" required')}
      ${field("Yazı", "", 'textarea name="body"')}
      <div class="actions"><button class="primary" type="submit">Bölümü oluştur</button></div>
    </form>`;
}

function articleEditor(article) {
  return `<div class="actions" style="margin-top:0">
      <span class="badge ${article.visible ? "" : "off"}">${article.visible ? "Sitede görünür" : "Gizli"}</span>
      <a class="ghost-link" href="/hizmetlerimiz#${escapeHtml(article.id)}" target="_blank" rel="noopener">Sitede gör</a>
      <span style="flex:1"></span>
      <button type="button" class="ghost" data-act="hide">${article.visible ? "Gizle" : "Göster"}</button>
      <button type="button" class="danger" data-act="delete">Sil</button>
    </div>
    ${article.image ? `<img class="cover" src="${escapeHtml(article.image)}" alt="">` : ""}
    ${fileButton("Fotoğrafı değiştir", "file")}
    <p class="muted">Sırayı üstteki karttan tutamacı sürükleyerek değiştirin.</p>
    ${field("Başlık", article.title, 'data-key="title"')}
    ${field("Yazı", article.body, 'textarea data-key="body"')}
    <div class="actions"><button type="button" class="primary" data-act="save">Değişiklikleri kaydet</button></div>`;
}

function bindNewArticle() {
  view.querySelector("#new-article").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const id = "a" + Date.now();
    content.articles.push({ id, title: data.title, body: data.body, image: "", visible: true, order: content.articles.length + 1 });
    state.creating = "";
    state.articleId = id;
    await save("Hizmet eklendi");
  });
}

function bindArticle(id) {
  const card = view.querySelector(".editor");
  const article = () => content.articles.find((item) => item.id === id);
  card.querySelector('[data-act="save"]').addEventListener("click", async () => {
    article().title = card.querySelector('[data-key="title"]').value;
    article().body = card.querySelector('[data-key="body"]').value;
    await save();
  });
  card.querySelector('[data-act="file"]').addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = await upload(file);
    if (!image) return;
    article().image = image;
    await save("Fotoğraf güncellendi");
  });
  card.querySelector('[data-act="hide"]').addEventListener("click", async () => {
    article().visible = !article().visible;
    await save(article().visible ? "Bölüm gösterildi" : "Bölüm gizlendi");
  });
  card.querySelector('[data-act="delete"]').addEventListener("click", async () => {
    if (!confirm("Bu hizmet yazısı silinsin mi?")) return;
    content.articles = content.articles.filter((item) => item.id !== id);
    state.articleId = "";
    await save("Hizmet silindi");
  });
}

function renderTexts() {
  const sections = [
    ["home", "Ana sayfa"],
    ["about", "Hakkımızda"],
    ["quality", "Kalite"],
    ["expert", "Uzmanlık"],
    ["contact", "İletişim"],
    ["footer", "Alt bilgi"],
  ];
  view.innerHTML = `
    <div class="pills">${sections.map(([id, label]) => `<button type="button" data-page="${id}" class="${state.textPage === id ? "active" : ""}">${label}</button>`).join("")}</div>
    <form id="texts" class="card">${textFields()}</form>`;
  view.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => { state.textPage = button.dataset.page; render(); });
  });
  view.querySelector("#texts").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(await readTexts())) return;
    await save();
  });
  view.querySelector("#add-feature")?.addEventListener("click", async () => {
    if (!(await readTexts())) return;
    content.quality.features.push({ id: "f" + Date.now(), title: "Yeni madde", text: "", order: content.quality.features.length + 1 });
    await save("Madde eklendi");
  });
  view.querySelectorAll("[data-drop-feature]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!(await readTexts())) return;
      content.quality.features = content.quality.features.filter((item) => item.id !== button.dataset.dropFeature);
      await save("Madde silindi");
    });
  });
}

function imageField(src, id, label) {
  return `${src ? `<img class="cover" src="${escapeHtml(src)}" alt="">` : ""}
    <label class="file">${label}<input id="${id}" type="file" accept="image/*"></label>`;
}

function textFields() {
  const hero = content.hero;
  const about = content.about;
  const quality = content.quality;
  const expert = content.expertise;
  const contact = content.contact;
  const footer = content.footer;
  if (state.textPage === "about") {
    return `<h2>Hakkımızda</h2>
      ${imageField(about.image, "about-image", "Net Hedefler fotoğrafı")}
      ${field("Üst yazı", about.eyebrow, 'data-path="about.eyebrow"')}
      ${field("Başlık", about.title, 'data-path="about.title"')}
      ${field("Alt başlık", about.lead, 'data-path="about.lead"')}
      ${field("Bölüm başlığı", about.heading, 'data-path="about.heading"')}
      ${field("Metin", about.body, 'textarea data-path="about.body"')}
      ${field("Hedef başlığı", about.goalsTitle, 'data-path="about.goalsTitle"')}
      <div class="split">${field("Vizyon başlığı", about.visionTitle, 'data-path="about.visionTitle"')}${field("Misyon başlığı", about.missionTitle, 'data-path="about.missionTitle"')}</div>
      ${field("Vizyon", about.vision, 'textarea data-path="about.vision"')}
      ${field("Misyon", about.mission, 'textarea data-path="about.mission"')}
      <div class="actions"><button class="primary" type="submit">Kaydet</button></div>`;
  }
  if (state.textPage === "quality") {
    return `<h2>Güven, hız, kalite</h2>
      ${imageField(quality.image, "quality-image", "Soldaki fotoğraf")}
      ${field("Üst yazı", quality.kicker, 'data-path="quality.kicker"')}
      ${field("Başlık", quality.title, 'data-path="quality.title"')}
      ${field("Metin", quality.text, 'textarea data-path="quality.text"')}
      ${quality.features.map((item, index) => `<div class="feature">${field("Madde " + (index + 1), item.title, `data-feature="${item.id}" data-part="title"`)}
        ${field("Yazı", item.text, `textarea data-feature="${item.id}" data-part="text"`)}
        <button type="button" class="x" data-drop-feature="${item.id}" aria-label="Maddeyi sil">×</button></div>`).join("")}
      <div class="actions"><button type="button" class="ghost" id="add-feature">Madde ekle</button><button class="primary" type="submit">Kaydet</button></div>`;
  }
  if (state.textPage === "expert") {
    return `<h2>Sektörel uzmanlık</h2>
      ${imageField(expert.image, "expert-image", "Soldaki fotoğraf")}
      ${field("Başlık", expert.title, 'data-path="expertise.title"')}
      ${field("Metin", expert.text, 'textarea data-path="expertise.text"')}
      ${field("Liste, her satır bir madde", expert.items.map((item) => item.label).join("\n"), 'textarea data-list="expertise"')}
      <div class="actions"><button class="primary" type="submit">Kaydet</button></div>`;
  }
  if (state.textPage === "contact") {
    return `<h2>İletişim</h2>
      ${imageField(contact.image, "contact-image", "Üst fotoğraf")}
      ${field("Başlık", contact.title, 'data-path="contact.title"')}
      ${field("Metin", contact.text, 'textarea data-path="contact.text"')}
      ${field("Form başlığı", contact.formTitle, 'data-path="contact.formTitle"')}
      ${field("Form açıklaması", contact.formText, 'textarea data-path="contact.formText"')}
      ${field("E-posta", contact.email, 'data-path="contact.email"')}
      ${field("Adres", contact.address, 'textarea data-path="contact.address"')}
      <div class="actions"><button class="primary" type="submit">Kaydet</button></div>`;
  }
  if (state.textPage === "footer") {
    return `<h2>Alt bilgi</h2>
      ${field("Kısa tanıtım", footer.blurb, 'textarea data-path="footer.blurb"')}
      ${field("Vizyon", footer.vision, 'textarea data-path="footer.vision"')}
      ${field("Misyon", footer.mission, 'textarea data-path="footer.mission"')}
      ${field("Bize ulaşın", footer.reach, 'textarea data-path="footer.reach"')}
      <div class="actions"><button class="primary" type="submit">Kaydet</button></div>`;
  }
  return `<h2>Ana sayfa karşılama</h2>
    ${imageField(hero.image, "hero-image", "Arka plan fotoğrafı")}
    ${field("Üst yazı", hero.eyebrow, 'data-path="hero.eyebrow"')}
    ${field("Başlık", hero.title, 'data-path="hero.title"')}
    ${field("Metin", hero.text, 'textarea data-path="hero.text"')}
    <div class="actions"><button class="primary" type="submit">Kaydet</button></div>`;
}

async function readTexts() {
  const form = view.querySelector("#texts");
  const files = {
    "hero-image": ["hero", "image"],
    "about-image": ["about", "image"],
    "quality-image": ["quality", "image"],
    "expert-image": ["expertise", "image"],
    "contact-image": ["contact", "image"],
  };
  for (const [id, [group, key]] of Object.entries(files)) {
    const file = form.querySelector("#" + id)?.files?.[0];
    if (!file) continue;
    const image = await upload(file);
    if (!image) return false;
    content[group][key] = image;
  }
  form.querySelectorAll("[data-path]").forEach((input) => {
    const [group, key] = input.dataset.path.split(".");
    content[group][key] = input.value;
  });
  form.querySelectorAll("[data-feature]").forEach((input) => {
    const feature = content.quality.features.find((item) => item.id === input.dataset.feature);
    if (feature) feature[input.dataset.part] = input.value;
  });
  const list = form.querySelector('[data-list="expertise"]');
  if (list) {
    const lines = list.value.split("\n").map((line) => line.trim()).filter(Boolean);
    content.expertise.items = lines.map((label, index) => ({ id: "e" + (index + 1), label, order: index + 1 }));
  }
  return true;
}

function renderGallery() {
  const shots = sorted(content.portfolio);
  view.innerHTML = `
    <div class="shot-grid">
      ${shots.map((shot) => `<article class="card shot" data-id="${shot.id}" data-drag="${shot.id}">
        <span class="grip" draggable="true" title="Sırayı değiştir">⋮⋮</span>
        <div class="frame-wrap">
          <img class="frame" src="${escapeHtml(shot.image)}" alt="">
          <button type="button" class="x" data-act="delete" aria-label="Sil">×</button>
        </div>
        <input data-key="caption" value="${escapeHtml(shot.caption)}" aria-label="Yazı">
        <div class="actions">
          <span class="badge ${shot.visible ? "" : "off"}">${shot.visible ? "Görünür" : "Gizli"}</span>
          <button type="button" class="ghost" data-act="hide">${shot.visible ? "Gizle" : "Göster"}</button>
          ${fileButton("Değiştir", "file")}
          <button type="button" data-act="save" class="primary">Kaydet</button>
        </div>
      </article>`).join("")}
      <form id="new-shot" class="card">
        <h2>Yeni fotoğraf</h2>
        ${field("Yazı", "", 'name="caption" required')}
        <label class="file">Fotoğraf seç<input name="image" type="file" accept="image/*" required></label>
        <div class="actions"><button class="primary" type="submit">Galeriye ekle</button></div>
      </form>
    </div>`;
  view.querySelectorAll(".shot").forEach((card) => {
    const shot = () => content.portfolio.find((item) => item.id === card.dataset.id);
    card.querySelector('[data-act="save"]').addEventListener("click", async () => {
      shot().caption = card.querySelector('[data-key="caption"]').value;
      await save();
    });
    card.querySelector('[data-act="hide"]').addEventListener("click", async () => {
      shot().visible = !shot().visible;
      await save(shot().visible ? "Fotoğraf gösterildi" : "Fotoğraf gizlendi");
    });
    card.querySelector('[data-act="delete"]').addEventListener("click", async () => {
      if (!confirm("Bu galeri fotoğrafı silinsin mi?")) return;
      content.portfolio = content.portfolio.filter((item) => item.id !== card.dataset.id);
      await save("Fotoğraf silindi");
    });
    card.querySelector('[data-act="file"]').addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const image = await upload(file);
      if (!image) return;
      shot().image = image;
      await save("Fotoğraf güncellendi");
    });
  });
  bindDrag(content.portfolio);
  view.querySelector("#new-shot").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const image = await upload(form.image.files[0]);
    if (!image) return;
    content.portfolio.push({ id: "p" + Date.now(), image, caption: form.caption.value, visible: true, order: content.portfolio.length + 1 });
    await save("Galeriye eklendi");
  });
}

function renderMessages() {
  const items = [...messages];
  if (!items.some((item) => item.id === state.messageId)) state.messageId = items[0]?.id || "";
  const current = items.find((item) => item.id === state.messageId);
  view.innerHTML = `
    <div class="inbox">
      <div class="list">
        ${items.length ? items.map((item) => `<button type="button" class="pick ${item.id === state.messageId ? "active" : ""}" data-pick="${item.id}">
          <span class="mark">${escapeHtml(item.name.slice(0, 1))}</span>
          <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(when(item.createdAt))}</small></span>
        </button>`).join("") : `<p class="empty">Henüz mesaj yok.</p>`}
      </div>
      <article class="letter">
        ${current ? `<h2>${escapeHtml(current.name)}</h2>
          <p class="meta">${escapeHtml(when(current.createdAt))}</p>
          <p><a href="mailto:${escapeHtml(current.email)}">${escapeHtml(current.email)}</a> · ${escapeHtml(current.phone)}</p>
          <p>${escapeHtml(current.message)}</p>
          <div class="actions">
            <a class="ghost-link" href="mailto:${escapeHtml(current.email)}">Yanıtla</a>
            <button type="button" class="danger" id="delete-message">Mesajı sil</button>
          </div>` : `<p class="empty">Seçilecek mesaj yok.</p>`}
      </article>
    </div>`;
  view.querySelectorAll("[data-pick]").forEach((button) => {
    button.addEventListener("click", () => { state.messageId = button.dataset.pick; render(); });
  });
  view.querySelector("#delete-message")?.addEventListener("click", async () => {
    if (!confirm("Bu mesaj silinsin mi?")) return;
    const data = await api("/api/mesaj/" + current.id, { method: "DELETE" });
    messages = data.messages;
    state.messageId = "";
    toast("Mesaj silindi");
    render();
  });
}

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.querySelector("#login-error");
  error.textContent = "";
  const data = Object.fromEntries(new FormData(event.target).entries());
  try {
    await api("/api/login", { method: "POST", body: JSON.stringify(data) });
    await openApp();
  } catch (err) {
    error.textContent = err.message;
  }
});

document.querySelector("#logout").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  app.hidden = true;
  login.hidden = false;
});

const navToggle = document.querySelector("#nav-toggle");
if (localStorage.getItem("admin-nav") === "hidden") {
  app.classList.add("nav-collapsed");
  navToggle.setAttribute("aria-label", "Menüyü göster");
}
navToggle.addEventListener("click", () => {
  const hidden = app.classList.toggle("nav-collapsed");
  localStorage.setItem("admin-nav", hidden ? "hidden" : "open");
  navToggle.setAttribute("aria-label", hidden ? "Menüyü göster" : "Menüyü gizle");
});

document.querySelectorAll("aside [data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    state.tab = button.dataset.tab;
    state.creating = "";
    render();
  });
});

async function openApp() {
  const data = await api(`/api/content?lang=${state.lang}`);
  content = data.view;
  messages = data.messages || [];
  login.hidden = true;
  app.hidden = false;
  render();
}

document.querySelector("#lang").addEventListener("change", async (event) => {
  const next = event.target.value;
  const prev = state.lang;
  if (next === prev) return;
  try {
    state.lang = next;
    localStorage.setItem("admin-lang", next);
    await openApp();
  } catch (error) {
    state.lang = prev;
    event.target.value = prev;
    toast(error.message, "bad");
  }
});

api("/api/me").then((data) => {
  if (data.ok) openApp();
}).catch(() => {});
