const API_BASE = "https://restcountries.com/v3.1"; // same API base used in the CodePen :contentReference[oaicite:1]{index=1}

const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("searchInput");
const regionSelect = document.getElementById("regionSelect");
const countriesGrid = document.getElementById("countriesGrid");
const statusEl = document.getElementById("status");

let allCountries = [];
let searchTerm = "";
let regionTerm = "all";

/* ---------------- THEME ---------------- */
initTheme();

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  document.body.classList.toggle("light", !isDark);

  localStorage.setItem("theme", isDark ? "dark" : "light");
  syncThemeButtonText();
});

function initTheme() {
  const saved = localStorage.getItem("theme");
  const shouldBeDark = saved === "dark";

  document.body.classList.toggle("dark", shouldBeDark);
  document.body.classList.toggle("light", !shouldBeDark);

  syncThemeButtonText();
}

function syncThemeButtonText() {
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "Dark Mode" : "Light Mode";
}

/* ---------------- DATA LOAD ---------------- */
loadCountries();

async function loadCountries() {
  setStatus("Loading countries...");
  try {
    // Fields reduces payload + faster render
    const url =
      `${API_BASE}/all?fields=name,flags,population,region,capital`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    allCountries = Array.isArray(data) ? data : [];
    setStatus(`Loaded ${allCountries.length.toLocaleString()} countries.`);
    renderCountries(applyFilters(allCountries));
  } catch (err) {
    console.error(err);
    setStatus("Failed to load countries. Check your internet and try again.");
  }
}

/* ---------------- FILTERS ---------------- */
searchInput.addEventListener("input", (e) => {
  searchTerm = (e.target.value || "").trim().toLowerCase();
  renderCountries(applyFilters(allCountries));
});

regionSelect.addEventListener("change", (e) => {
  regionTerm = (e.target.value || "all").toLowerCase();
  renderCountries(applyFilters(allCountries));
});

function applyFilters(list) {
  return list
    .filter((c) => {
      if (!searchTerm) return true;
      const name = c?.name?.common || "";
      return name.toLowerCase().includes(searchTerm);
    })
    .filter((c) => {
      if (regionTerm === "all") return true;
      const region = (c?.region || "").toLowerCase();
      return region === regionTerm;
    })
    .sort((a, b) => {
      const an = a?.name?.common || "";
      const bn = b?.name?.common || "";
      return an.localeCompare(bn);
    });
}

/* ---------------- RENDER ---------------- */
function renderCountries(list) {
  countriesGrid.innerHTML = "";

  if (!list.length) {
    setStatus("No countries match your search/filter.");
    return;
  } else {
    setStatus(`Showing ${list.length.toLocaleString()} countries.`);
  }

  const frag = document.createDocumentFragment();

  for (const country of list) {
    const name = country?.name?.common || "N/A";
    const population = Number(country?.population || 0).toLocaleString();
    const region = country?.region || "N/A";
    const capital = country?.capital?.[0] || "N/A";
    const flagUrl = country?.flags?.svg || country?.flags?.png || "";

    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open details for ${name}`);

    card.innerHTML = `
      <img class="flag" src="${escapeAttr(flagUrl)}" alt="${escapeAttr(name)} flag" loading="lazy" />
      <div class="card-body">
        <h2 class="card-title">${escapeHtml(name)}</h2>
        <p class="meta"><strong>Population:</strong> ${escapeHtml(population)}</p>
        <p class="meta"><strong>Region:</strong> ${escapeHtml(region)}</p>
        <p class="meta"><strong>Capital:</strong> ${escapeHtml(capital)}</p>
      </div>
    `;

    const go = () => {
      // You can connect this to your existing details page
      window.location.href = `details.html?name=${encodeURIComponent(name)}`;
    };

    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });

    frag.appendChild(card);
  }

  countriesGrid.appendChild(frag);
}

function setStatus(text) {
  statusEl.textContent = text;
}

/* ---------------- SAFETY HELPERS ---------------- */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  // attribute-safe (still basic)
  return escapeHtml(str).replaceAll("`", "&#096;");
}

