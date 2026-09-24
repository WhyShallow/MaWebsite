const projects = [
{
name: "Tasbeeh Counter",
type: "Do Tasbeeh In Minecraft",
description: "Do Tasbeeh In Minecraft Without Switching Apps Or using irl counter",
stack: "Java / Minecraft",
repo: "https://www.curseforge.com/minecraft/mc-mods/tasbeeh-counter"
}
];

const output = document.getElementById("output");
const terminal = document.getElementById("terminal");
const input = document.getElementById("commandInput");
const clock = document.getElementById("clock");
let history = [];
let historyIndex = -1;

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({
"&": "&",
"<": "<",
">": ">",
"\"": """
}[c] || c));

function print(html = "") {
const row = document.createElement("div");
row.className = html === "" ? "spacer" : "line";
row.innerHTML = html;
output.appendChild(row);
terminal.scrollTop = terminal.scrollHeight;
}

function commandEcho(cmd) {
print(`<span class="prompt">C:\\Users\\WhyShallow&gt;</span> ${esc(cmd)}`);
}

function boot() {
print(`<div class="ascii">  _____                       _            __     __                            <br> / ____|                     | |           \\ \\   / /                            <br>| (___  _ __   ___   ___   __| | ___ _ __  \\ \\_/ /__ _ __   ___  _ __ ___    <br> \\___ \\| '_ \\ / _ \\ / _ \\ / _\` |/ _ \ '**|  \   / _ \ '_ \ / _ \ '**/ **|   <br> ****) | |*) | (*) | (*) | (*| |  **/ |      | |  **/ | | |  **/ |  \** \   <br>|****_/| .**/ \***/ \***/ \**,*|\***|*|      |*|\***|*| |*|\***|*|  |***/   <br>       | |                                                                  <br>       |_|                                                                  </div>`);
  print(`<span class="green">[OK]</span> portfolio.exe initialized`);
  print(`<span class="dim">Welcome to WhyShallow's project directory.</span>`);
  print(`Type <span class="yellow">help</span> to list commands.`);
print();
}

function showHelp() {
print(`<span class="bold">Available commands</span>`);
print(`<span class="yellow">help</span>       Show this command list`);
print(`<span class="yellow">projects</span>    List projects`);
print(`<span class="yellow">open NAME</span>   Open a project's page/repository`);
print(`<span class="yellow">about</span>       About this portfolio`);
print(`<span class="yellow">contact</span>     Show contact / social links`);
print(`<span class="yellow">status</span>      Show site status`);
print(`<span class="yellow">clear</span>       Clear the terminal`);
print();
}

function showProjects() {
print(`<span class="bold">PROJECTS (${projects.length})</span>`);
print(`<span class="dim">------------------------------------------------------------</span>`);
const grid = document.createElement("div");
grid.className = "project-grid";

for (const p of projects) {
const card = document.createElement("article");
card.className = "project-card";

```
card.innerHTML = `
  <div class="project-head">
    <span class="project-name">${esc(p.name)}</span>
    <span class="project-type">${esc(p.type)}</span>
  </div>
  <p>${esc(p.description)}</p>
  <p><span class="green">STACK</span> ${esc(p.stack)}</p>
  <div class="project-links">
    <a href="${esc(p.repo)}" target="_blank" rel="noreferrer">[ repository ]</a>
  </div>`;

grid.appendChild(card);
```

}

output.appendChild(grid);
print();
}

function showAbout() {
print(`<span class="bold">ABOUT</span>`);
print(`Developer: <span class="blue">WhyShallow</span>`);
print(`Focus: Minecraft development, Java, client mods, server plugins, tools, and experiments.`);
print(`Interface: Windows terminal inspired.`);
print(`Hosting target: <span class="green">whyshallow.is-a.dev</span>`);
print();
}

function showContact() {
print(`<span class="bold">CONTACT</span>`);
print(`GitHub: <a class="blue" href="https://github.com/WhyShallow" target="_blank" rel="noreferrer">github.com/WhyShallow</a>`);
print(`Discord: <span class="dim">add your handle in script.js</span>`);
print(`Email: <span class="dim">add your address in script.js</span>`);
print();
}

function showStatus() {
print(`<span class="bold">SYSTEM STATUS</span>`);
print(`<span class="green">[ONLINE]</span> portfolio interface`);
print(`<span class="green">[ONLINE]</span> static assets`);
print(`<span class="blue">[INFO]</span> ${projects.length} project entries loaded`);
print(`<span class="dim">[NOTE]</span> repository links are editable placeholders except Pawn.`);
print();
}

function openProject(name) {
const q = name.trim().toLowerCase();
const p = projects.find(
x => x.name.toLowerCase() === q || x.name.toLowerCase().includes(q)
);

if (!p) {
print(`<span class="yellow">The system cannot find the project specified:</span> ${esc(name)}`);
print();
return;
}

print(`Launching <span class="bold">${esc(p.name)}</span> ...`);
window.open(p.repo, "_blank", "noopener,noreferrer");
print(`<span class="green">[OPEN]</span> ${esc(p.repo)}`);
print();
}

function runCommand(raw) {
const cmd = raw.trim();

if (!cmd) {
print();
return;
}

history.unshift(cmd);
history = history.slice(0, 50);
historyIndex = -1;

commandEcho(cmd);

const [verb, ...rest] = cmd.split(/\s+/);
const arg = rest.join(" ");

switch (verb.toLowerCase()) {
case "help":
case "?":
showHelp();
break;

```
case "projects":
case "dir":
case "ls":
  showProjects();
  break;

case "open":
case "start":
  if (arg) {
    openProject(arg);
  } else {
    print(`<span class="yellow">Usage:</span> open NAME`);
  }
  break;

case "about":
  showAbout();
  break;

case "contact":
  print(`<span class="dim">Contact info:</span>`);
  showContact();
  break;

case "status":
  showStatus();
  break;

case "clear":
  output.innerHTML = "";
  break;

case "cls":
  output.innerHTML = "";
  break;

case "whoami":
  print(`<span class="blue">WhyShallow</span>`);
  print();
  break;

default:
  print(`'${esc(verb)}' is not recognized as an internal or external command, operable program or batch file.`);
  print(`Type <span class="yellow">help</span> for available commands.`);
  print();
```

}
}

input.addEventListener("keydown", (e) => {
if (e.key === "Enter") {
const value = input.value;
input.value = "";
runCommand(value);
} else if (e.key === "ArrowUp") {
e.preventDefault();

```
if (!history.length) return;

historyIndex = Math.min(historyIndex + 1, history.length - 1);
input.value = history[historyIndex] || "";
```

} else if (e.key === "ArrowDown") {
e.preventDefault();

```
historyIndex = Math.max(historyIndex - 1, -1);
input.value = historyIndex === -1 ? "" : history[historyIndex];
```

}
});

document.addEventListener("click", () => input.focus());
terminal.addEventListener("click", () => input.focus());

function updateClock() {
clock.textContent = new Date().toLocaleTimeString([], {
hour12: false
});
}

updateClock();
setInterval(updateClock, 1000);

boot();
input.focus();
