const books = [
  {
    title: "Guftar",
    cover: "/assets/books/guftar.png",
    price: 600,
    orderUrl: "https://youtube.com/@WhyShallow",
    color: "#f27c5d"
  },
  {
    title: "Al Ishq",
    cover: "/assets/books/al-ishq.png",
    price: 1100,
    orderUrl: "https://youtube.com/@WhyShallow",
    color: "#d5ef67"
  }
];
const orderApiUrl = "https://whyshallow-suggestions.marhamjz23.workers.dev";

const bookGrid = document.querySelector("#bookGrid");
const bookEmpty = document.querySelector("#bookEmpty");
const bookCount = document.querySelector("#bookCount");
const orderDialog = document.querySelector("#orderDialog");
const orderForm = document.querySelector("#orderForm");
const orderAddress = document.querySelector("#orderAddress");
const orderDialogBook = document.querySelector("#orderDialogBook");
const orderStatus = document.querySelector("#orderStatus");
const orderSubmit = orderForm.querySelector('button[type="submit"]');
let selectedBook = null;
let isSubmittingOrder = false;

function setOrderStatus(message, state = "") {
  orderStatus.textContent = message;
  orderStatus.dataset.state = state;
}

function openOrderDialog(book) {
  selectedBook = book;
  orderDialogBook.textContent = book.title;
  orderForm.reset();
  setOrderStatus("");
  orderDialog.showModal();
  orderAddress.focus();
}

function makeBookCard(book, index) {
  const card = document.createElement("article");
  card.className = "book-card";

  const cover = document.createElement("div");
  cover.className = "book-cover";
  cover.style.setProperty("--cover-color", book.color);
  if (book.cover) {
    const image = document.createElement("img");
    image.className = "book-cover-image";
    image.src = book.cover;
    image.alt = `${book.title} book cover`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      const placeholder = document.createElement("span");
      placeholder.className = "book-cover-title";
      placeholder.textContent = book.title;
      image.replaceWith(placeholder);
    }, { once: true });
    cover.append(image);
  }

  const content = document.createElement("div");
  content.className = "book-card-content";
  const meta = document.createElement("div");
  meta.className = "book-card-meta";
  const label = document.createElement("span");
  label.textContent = "Book";
  const number = document.createElement("span");
  number.textContent = String(index + 1).padStart(2, "0");
  meta.append(label, number);

  const title = document.createElement("h3");
  title.textContent = book.title;
  const price = document.createElement("p");
  price.className = "book-price";
  price.textContent = `${book.price} Rs.`;

  const order = document.createElement("button");
  order.type = "button";
  order.disabled = !book.orderUrl;
  order.title = book.orderUrl ? "" : "Add an order link in njz/books.js to enable this button";
  order.className = "button button-dark book-order";
  order.textContent = "Order";
  order.addEventListener("click", () => openOrderDialog(book));

  content.append(meta, title, price, order);
  card.append(cover, content);
  return card;
}

for (const [index, book] of books.entries()) {
  bookGrid.append(makeBookCard(book, index));
}

bookCount.textContent = `${books.length} ${books.length === 1 ? "book" : "books"}`;
bookEmpty.hidden = books.length > 0;
document.querySelector("#year").textContent = new Date().getFullYear();

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const address = orderAddress.value.trim();

  if (!selectedBook || !address) {
    setOrderStatus("Please enter your delivery address.", "error");
    orderAddress.focus();
    return;
  }

  isSubmittingOrder = true;
  for (const control of orderForm.elements) control.disabled = true;
  orderSubmit.classList.add("is-loading");
  orderSubmit.setAttribute("aria-busy", "true");
  setOrderStatus("Sending your address…", "pending");

  try {
    const response = await fetch(orderApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "book-order",
        bookTitle: selectedBook.title,
        address
      })
    });

    if (response.status === 429) {
      setOrderStatus("Too many requests. Please try again later.", "error");
      return;
    }

    if (!response.ok) {
      throw new Error(`Book order request failed with status ${response.status}.`);
    }

    const destination = selectedBook.orderUrl;
    orderDialog.close();
    window.location.assign(destination);
  } catch (error) {
    console.error("Could not send book order address.", error);
    setOrderStatus("Couldn’t send your address just now. Please try again later.", "error");
  } finally {
    isSubmittingOrder = false;
    for (const control of orderForm.elements) control.disabled = false;
    orderSubmit.classList.remove("is-loading");
    orderSubmit.removeAttribute("aria-busy");
  }
});

orderDialog.addEventListener("cancel", (event) => {
  if (isSubmittingOrder) event.preventDefault();
});
orderForm.querySelector("[data-order-cancel]").addEventListener("click", () => orderDialog.close());

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
