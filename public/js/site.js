const header = document.querySelector(".header");
if (header && document.body.classList.contains("has-hero")) {
  const syncHeader = () => header.classList.toggle("is-solid", window.scrollY > 24);
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
}

const button = document.querySelector(".menu-btn");
const nav = document.querySelector(".nav");
if (button && nav) {
  button.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });
}

const langBox = document.querySelector(".lang");
const langBtn = document.querySelector(".lang-btn");
if (langBox && langBtn) {
  langBtn.addEventListener("click", () => {
    const open = langBox.classList.toggle("open");
    langBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", (event) => {
    if (!langBox.contains(event.target)) {
      langBox.classList.remove("open");
      langBtn.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    langBox.classList.remove("open");
    langBtn.setAttribute("aria-expanded", "false");
  });
}

if (location.hash) {
  document.querySelectorAll(".lang-menu a").forEach((link) => {
    const url = new URL(link.getAttribute("href"), location.origin);
    url.hash = location.hash;
    link.setAttribute("href", `${url.pathname}${url.hash}`);
  });
}

const form = document.querySelector("#contact-form");
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/mesaj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      alert(form.dataset.error || "Mesaj gönderilemedi. Lütfen tekrar deneyin.");
      return;
    }
    form.querySelector(".form-success").classList.add("show");
    form.reset();
  });
}
