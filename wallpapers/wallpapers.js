const wallpapers = window.wallpaperCatalog;

const wallpaperGrid = document.querySelector("#wallpaperGrid");
const wallpaperEmpty = document.querySelector("#wallpaperEmpty");
const wallpaperCount = document.querySelector("#wallpaperCount");

function makeWallpaperCard(wallpaper, index) {
  const card = document.createElement("article");
  card.className = "wallpaper-card";

  const preview = document.createElement("div");
  preview.className = "wallpaper-preview";
  const image = document.createElement("img");
  image.src = wallpaper.file;
  image.alt = wallpaper.alt || wallpaper.name;
  image.loading = "lazy";
  image.decoding = "async";
  preview.append(image);

  const content = document.createElement("div");
  content.className = "wallpaper-card-content";
  const meta = document.createElement("div");
  meta.className = "wallpaper-card-meta";
  const resolution = document.createElement("span");
  resolution.textContent = wallpaper.resolution;
  const number = document.createElement("span");
  number.textContent = String(index + 1).padStart(2, "0");
  meta.append(resolution, number);

  const title = document.createElement("h3");
  title.textContent = wallpaper.name;
  const download = document.createElement("a");
  download.className = "button button-dark wallpaper-download";
  download.href = wallpaper.file;
  download.download = wallpaper.filename || wallpaper.file.split("/").pop();
  download.setAttribute("aria-label", `Download ${wallpaper.name}`);
  download.textContent = "Download wallpaper ↓";

  content.append(meta, title, download);
  card.append(preview, content);
  return card;
}

for (const [index, wallpaper] of wallpapers.entries()) {
  wallpaperGrid.append(makeWallpaperCard(wallpaper, index));
}

wallpaperCount.textContent = `${wallpapers.length} ${wallpapers.length === 1 ? "wallpaper" : "wallpapers"}`;
wallpaperEmpty.hidden = wallpapers.length > 0;
document.querySelector("#year").textContent = new Date().getFullYear();

const themeToggle = document.querySelector(".theme-toggle");
const savedTheme = (() => {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
})();

function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  themeToggle.title = `Switch to ${isDark ? "light" : "dark"} mode`;
  themeToggle.querySelector("path").setAttribute("d", isDark
    ? "M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
    : "M20.2 15.1A8.4 8.4 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z");
  try {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  } catch {
    // Theme remains available for this page view when storage is unavailable.
  }
}

setTheme(savedTheme === "dark" ? "dark" : "light");
themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

const siteHeader = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
siteHeader.classList.add("is-enhanced");

function setMobileMenuOpen(isOpen) {
  siteHeader.classList.toggle("is-menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
}

menuToggle.addEventListener("click", () => {
  setMobileMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

mainNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMobileMenuOpen(false);
});

document.addEventListener("click", (event) => {
  if (!siteHeader.contains(event.target)) setMobileMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
  setMobileMenuOpen(false);
  menuToggle.focus();
});

siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
window.addEventListener("scroll", () => {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
}, { passive: true });