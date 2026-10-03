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
    image.src = project.image;
    image.alt = `${project.name} pixel-art logo`;
    artwork.append(image);
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

const suggestionForm = document.querySelector("#suggestionForm");
const suggestionInput = document.querySelector("#suggestion");
const suggestionName = document.querySelector("#suggestionName");
const suggestionStatus = document.querySelector("#suggestionStatus");
const suggestionSubmit = suggestionForm.querySelector('button[type="submit"]');

suggestionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const suggestion = suggestionInput.value.trim();

  if (!suggestion) {
    suggestionStatus.textContent = "Please enter a suggestion before sending.";
    suggestionInput.focus();
    return;
  }

  if (!profile.suggestionApiUrl) {
    suggestionStatus.textContent = "The suggestion box isn’t connected yet. Please try again later.";
    return;
  }

  suggestionSubmit.disabled = true;
  suggestionStatus.textContent = "Sending your suggestion…";

  try {
    const response = await fetch(profile.suggestionApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestion, name: suggestionName.value.trim() })
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      suggestionStatus.textContent = Number.isFinite(retryAfter) && retryAfter > 0
        ? `You’ve sent a few suggestions. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`
        : "You’ve sent a few suggestions. Please try again later.";
      return;
    }

    if (!response.ok) {
      throw new Error(`Suggestion request failed with status ${response.status}.`);
    }

    suggestionForm.reset();
    suggestionStatus.textContent = "Thanks! Your suggestion has been sent.";
  } catch (error) {
    console.error("Could not send suggestion.", error);
    suggestionStatus.textContent = "Couldn’t send that just now. Please try again later.";
  } finally {
    suggestionSubmit.disabled = false;
  }
});