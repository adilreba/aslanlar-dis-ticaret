const header = document.querySelector(".header");
const menuBtn = document.querySelector(".menu-btn");
const nav = document.querySelector(".nav");

function onScroll() {
  header.classList.toggle("is-stuck", window.scrollY > 24);
}
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

menuBtn.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  header.classList.toggle("is-stuck", open || window.scrollY > 24);
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    menuBtn.setAttribute("aria-expanded", "false");
  });
});

const form = document.querySelector("#contact-form");
if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const message = String(data.get("message") || "").trim();
    const body = `İsim: ${name}\nE-posta: ${email}\nTelefon: ${phone}\n\n${message}`;
    const mailto = `mailto:info@aslanlardisticaret.com?subject=${encodeURIComponent("Web sitesi iletişim formu")}&body=${encodeURIComponent(body)}`;
    document.querySelector(".form-success").classList.add("show");
    window.location.href = mailto;
    form.reset();
  });
}
