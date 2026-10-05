const profile = {
  youtubeUrl: "https://www.youtube.com/@WhyShallow",
  suggestionApiUrl: "https://whyshallow-suggestions.marhamjz23.workers.dev"
};

const projects = [
  {
    name: "Pawn-io",
    category: "Minecraft mod",
    description: "Everyday Minecraft essentials, rethought: a sharper, more capable toolkit with a clean black-and-white theme.",
    tags: ["Minecraft", "Utility"],
    url: "https://pawn-io.pages.dev/",
    linkLabel: "Visit website",
    image: "assets/pawn-io.svg",
    theme: "monochrome"
  },
  {
    name: "Tasbeeh Counter",
    category: "Minecraft mod",
    description: "A simple in-game counter for doing tasbeeh without switching apps or reaching for a separate counter.",
    tags: ["Java", "Minecraft"],
    url: "https://www.curseforge.com/minecraft/mc-mods/tasbeeh-counter",
    visual: "counter"
  }
];

const projectGrid = document.querySelector("#projectGrid");

function makeProjectArtwork(project) {
  const artwork = document.createElement("div");
  artwork.className = project.theme === "monochrome"
    ? "project-art project-art--monochrome"
    : "project-art";

  if (project.visual === "counter") {
    artwork.setAttribute("role", "img");
    artwork.setAttribute("aria-label", "Illustration of a simple tasbeeh counter interface");

    const mockWindow = document.createElement("div");
    mockWindow.className = "counter-window";
    const top = document.createElement("div");
    top.className = "counter-top";
    top.innerHTML = "<span>Tasbeeh</span><span>In game</span>";
    const number = document.createElement("div");
    number.className = "counter-number";
    number.textContent = "33";
    const controls = document.createElement("div");
    controls.className = "counter-controls";
    controls.setAttribute("aria-hidden", "true");
    controls.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
    mockWindow.append(top, number, controls);
    artwork.append(mockWindow);
  } else if (project.image) {
    const image = document.createElement("img");
    image.className = "project-art-image";
    image.alt = `${project.name} pixel-art logo`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
    image.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = `generic-art-mark${project.theme === "monochrome" ? " generic-art-mark--light" : ""}`;
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = project.name.slice(0, 2).toUpperCase();
      artwork.replaceChild(fallback, image);
    }, { once: true });
    artwork.append(image);
    image.src = project.image;
  } else {
    artwork.setAttribute("aria-hidden", "true");
    const mark = document.createElement("span");
    mark.className = "generic-art-mark";
    mark.textContent = project.artMark || project.name.slice(0, 2).toUpperCase();
    artwork.append(mark);
  }

  return artwork;
}

function makeProjectCard(project, index) {
  const card = document.createElement("article");
  card.className = "project-card";
  card.append(makeProjectArtwork(project));

  const content = document.createElement("div");
  content.className = "project-content";
  const meta = document.createElement("div");
  meta.className = "project-meta";
  const category = document.createElement("span");
  category.textContent = project.category;
  const number = document.createElement("span");
  number.className = "project-number";
  number.textContent = String(index + 1).padStart(2, "0");
  meta.append(category, number);

  const title = document.createElement("h3");
  title.textContent = project.name;
  const description = document.createElement("p");
  description.textContent = project.description;
  const bottom = document.createElement("div");
  bottom.className = "project-bottom";
  const tags = document.createElement("div");
  tags.className = "project-tags";

  for (const label of project.tags) {
    const tag = document.createElement("span");
    tag.className = "project-tag";
    tag.textContent = label;
    tags.append(tag);
  }

  const link = document.createElement("a");
  link.className = "project-link";
  link.href = project.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = `${project.linkLabel || "View project"} ↗`;
  bottom.append(tags, link);
  content.append(meta, title, description, bottom);
  card.append(content);
  return card;
}

for (const [index, project] of projects.entries()) {
  projectGrid.append(makeProjectCard(project, index));
}

document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector(".youtube-link").href = profile.youtubeUrl;

const secretPage = document.querySelector("#secretPage");
const secretLoginForm = document.querySelector("#secretLoginForm");
const secretTokenInput = document.querySelector("#secretToken");
const secretLoginStatus = document.querySelector("#secretLoginStatus");
const secretManager = document.querySelector("#secretManager");
const videoUploadForm = document.querySelector("#videoUploadForm");
const videoFileInput = document.querySelector("#videoFile");
const videoUploadStatus = document.querySelector("#videoUploadStatus");
const videoLibrary = document.querySelector("#videoLibrary");
const videoApiUrl = new URL("/videos", profile.suggestionApiUrl).href;
const maxVideoSize = 90 * 1024 * 1024;
let videoAdminToken = "";
const videoObjectUrls = new Map();

function setSecretStatus(element, message, state = "") {
  element.textContent = message;
  element.dataset.state = state;
}

async function privateVideoRequest(path = "", options = {}) {
  const response = await fetch(`${videoApiUrl}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${videoAdminToken}` }
  });

  if (!response.ok) {
    let message = `Video request failed (${response.status}).`;
    try {
      const result = await response.json();
      if (result.message) message = result.message;
    } catch {
      // Keep the status-based message if the worker returned no JSON.
    }
    throw new Error(message);
  }

  return response;
}

function formatVideoSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function loadPrivateVideos() {
  const response = await privateVideoRequest();
  const { videos } = await response.json();
  videoLibrary.replaceChildren();

  if (!videos.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "secret-status";
    emptyMessage.textContent = "No videos uploaded yet.";
    videoLibrary.append(emptyMessage);
    return;
  }

  for (const savedVideo of videos) {
    const item = document.createElement("article");
    item.className = "secret-video-item";
    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = savedVideo.name;
    const metadata = document.createElement("p");
    const uploadedAt = savedVideo.uploadedAt ? new Date(savedVideo.uploadedAt).toLocaleString() : "Upload date unknown";
    metadata.textContent = `${formatVideoSize(savedVideo.size)} · ${uploadedAt}`;
    details.append(title, metadata);

    const actions = document.createElement("div");
    actions.className = "secret-video-actions";
    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.textContent = "Load & play";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    actions.append(playButton, deleteButton);

    const player = document.createElement("video");
    player.className = "secret-player";
    player.controls = true;
    player.preload = "none";
    player.hidden = true;
    playButton.addEventListener("click", async () => {
      playButton.disabled = true;
      playButton.textContent = "Loading video…";
      try {
        const response = await privateVideoRequest(`/${encodeURIComponent(savedVideo.id)}`);
        const playbackUrl = URL.createObjectURL(await response.blob());
        videoObjectUrls.set(savedVideo.id, playbackUrl);
        player.src = playbackUrl;
        player.hidden = false;
        playButton.hidden = true;
        await player.play();
      } catch (error) {
        setSecretStatus(videoUploadStatus, error.message, "error");
        playButton.textContent = "Try again";
        playButton.disabled = false;
      }
    });
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm(`Delete “${savedVideo.name}” permanently?`)) return;
      deleteButton.disabled = true;
      try {
        await privateVideoRequest(`/${encodeURIComponent(savedVideo.id)}`, { method: "DELETE" });
        const playbackUrl = videoObjectUrls.get(savedVideo.id);
        if (playbackUrl) URL.revokeObjectURL(playbackUrl);
        videoObjectUrls.delete(savedVideo.id);
        await loadPrivateVideos();
      } catch (error) {
        setSecretStatus(videoUploadStatus, error.message, "error");
        deleteButton.disabled = false;
      }
    });

    item.append(details, actions, player);
    videoLibrary.append(item);
  }
}

secretLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  videoAdminToken = secretTokenInput.value.trim();
  if (!videoAdminToken) return;
  const submitButton = secretLoginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setSecretStatus(secretLoginStatus, "Checking access…");
  try {
    await loadPrivateVideos();
    secretLoginForm.hidden = true;
    secretManager.hidden = false;
    secretTokenInput.value = "";
    setSecretStatus(videoUploadStatus, "Library unlocked.", "success");
  } catch (error) {
    videoAdminToken = "";
    setSecretStatus(secretLoginStatus, error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

videoUploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = videoFileInput.files[0];
  if (!file) return;
  if (file.size > maxVideoSize) {
    setSecretStatus(videoUploadStatus, "That video is larger than the 90 MiB upload limit.", "error");
    return;
  }

  const submitButton = videoUploadForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setSecretStatus(videoUploadStatus, "Uploading video…");
  try {
    await privateVideoRequest("", { method: "POST", body: new FormData(videoUploadForm) });
    videoUploadForm.reset();
    await loadPrivateVideos();
    setSecretStatus(videoUploadStatus, "Video uploaded and saved privately.", "success");
  } catch (error) {
    setSecretStatus(videoUploadStatus, error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

function lockPrivateLibrary() {
  videoAdminToken = "";
  secretLoginForm.reset();
  secretLoginForm.hidden = false;
  secretManager.hidden = true;
  videoLibrary.replaceChildren();
  for (const playbackUrl of videoObjectUrls.values()) URL.revokeObjectURL(playbackUrl);
  videoObjectUrls.clear();
  setSecretStatus(secretLoginStatus, "");
  setSecretStatus(videoUploadStatus, "");
}

function updateSecretRoute() {
  const isSecretPage = window.location.hash === "#secret";
  document.body.classList.toggle("secret-mode", isSecretPage);
  secretPage.hidden = !isSecretPage;
  if (!isSecretPage) lockPrivateLibrary();
}

window.addEventListener("hashchange", updateSecretRoute);
updateSecretRoute();

document.querySelector("#secretSignout").addEventListener("click", lockPrivateLibrary);

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
  try {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  } catch {
    // Theme still works for this page view if storage is unavailable.
  }
}

setTheme(savedTheme === "dark" ? "dark" : "light");
themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

const siteHeader = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const navLinks = [...mainNav.querySelectorAll("a[href^='#']")];
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

const mobileMenuQuery = window.matchMedia("(max-width: 760px)");
mobileMenuQuery.addEventListener("change", (event) => {
  if (!event.matches) setMobileMenuOpen(false);
});

let activeNavSection = null;
const navSectionObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
    const activeEntry = entries.find((entry) => entry.isIntersecting);
    if (activeEntry) {
      activeNavSection = activeEntry.target;
      for (const link of navLinks) {
        if (link.hash === `#${activeEntry.target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    } else if (activeNavSection && entries.some((entry) => entry.target === activeNavSection)) {
      activeNavSection = null;
      for (const link of navLinks) link.removeAttribute("aria-current");
    }
  }, { rootMargin: "-20% 0px -60% 0px" })
  : null;

if (navSectionObserver) {
  for (const link of navLinks) {
    const section = document.querySelector(link.hash);
    if (section) navSectionObserver.observe(section);
  }
}

const revealTargets = document.querySelectorAll(
  ".section-heading, .project-card, .about-stamp, .about-copy, .youtube-inner, .latest-video, .discord-inner, .suggestions-inner, .site-footer"
);

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.14, rootMargin: "0px 0px -36px 0px" });

  let projectCardIndex = 0;
  for (const target of revealTargets) {
    target.classList.add("reveal");
    if (target.matches(".project-card")) {
      target.style.setProperty("--reveal-delay", `${Math.min(projectCardIndex * 100, 300)}ms`);
      projectCardIndex += 1;
    }
    revealObserver.observe(target);
  }
}

const scrollCue = document.querySelector(".scroll-cue");
let scrollBlurTimer;

function clearScrollBlur() {
  document.documentElement.classList.remove("scroll-blur");
}

function scheduleScrollBlurClear(delay) {
  window.clearTimeout(scrollBlurTimer);
  scrollBlurTimer = window.setTimeout(clearScrollBlur, delay);
}

scrollCue.addEventListener("click", (event) => {
  event.preventDefault();
  const workSection = document.querySelector("#work");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("scroll-blur");
  workSection.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  scheduleScrollBlurClear(prefersReducedMotion ? 700 : 2200);
});

siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
window.addEventListener("scroll", () => {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
  if (document.documentElement.classList.contains("scroll-blur")) {
    scheduleScrollBlurClear(180);
  }
}, { passive: true });
window.addEventListener("scrollend", clearScrollBlur, { passive: true });

const suggestionForm = document.querySelector("#suggestionForm");
const suggestionInput = document.querySelector("#suggestion");
const suggestionName = document.querySelector("#suggestionName");
const suggestionStatus = document.querySelector("#suggestionStatus");
const suggestionSubmit = suggestionForm.querySelector('button[type="submit"]');

function setSuggestionStatus(message, state = "") {
  suggestionStatus.textContent = message;
  suggestionStatus.dataset.state = state;
}

suggestionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const suggestion = suggestionInput.value.trim();
  const name = suggestionName.value.trim();

  if (!suggestion) {
    setSuggestionStatus("Please enter a suggestion before sending.", "error");
    suggestionInput.focus();
    return;
  }

  if (!name) {
    setSuggestionStatus("Please enter your username before sending.", "error");
    suggestionName.focus();
    return;
  }

  if (!profile.suggestionApiUrl) {
    setSuggestionStatus("The suggestion box isn’t connected yet. Please try again later.", "error");
    return;
  }

  suggestionSubmit.disabled = true;
  suggestionSubmit.classList.add("is-loading");
  suggestionSubmit.setAttribute("aria-busy", "true");
  setSuggestionStatus("Sending your suggestion…", "pending");

  try {
    const response = await fetch(profile.suggestionApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestion, name })
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      setSuggestionStatus(Number.isFinite(retryAfter) && retryAfter > 0
        ? `You’ve sent a few suggestions. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`
        : "You’ve sent a few suggestions. Please try again later.", "error");
      return;
    }

    if (!response.ok) {
      throw new Error(`Suggestion request failed with status ${response.status}.`);
    }

    suggestionForm.reset();
    setSuggestionStatus("Thanks! Your suggestion has been sent.", "success");
  } catch (error) {
    console.error("Could not send suggestion.", error);
    setSuggestionStatus("Couldn’t send that just now. Please try again later.", "error");
  } finally {
    suggestionSubmit.disabled = false;
    suggestionSubmit.classList.remove("is-loading");
    suggestionSubmit.removeAttribute("aria-busy");
  }
});