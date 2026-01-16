const API_BASE = "https://restcountries.com/v3.1";

const themeToggle = document.getElementById("themeToggle");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");

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


/* ---------------- URL PARAM ---------------- */
const params = new URLSearchParams(window.location.search);
const countryName = params.get("name");

if (!countryName) {
  setStatus("No country was selected. Go back and choose a country.");
} else {
  loadCountryByName(countryName);
}

/* ---------------- FETCH + RENDER ---------------- */
async function loadCountryByName(name) {
  setStatus("Loading country details...");
  detailsEl.innerHTML = "";

  try {
    // fullText=false is safer when you pass common name from card
    const url = `${API_BASE}/name/${encodeURIComponent(name)}?fullText=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      setStatus("Country not found.");
      return;
    }

    // pick best match: exact common name if available, else first
    const exact = data.find(
      (c) => (c?.name?.common || "").toLowerCase() === name.toLowerCase()
    );
    const country = exact || data[0];

    const borderLinksHtml = await buildBorders(country?.borders || []);

    renderCountry(country, borderLinksHtml);
    setStatus("Loaded.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load details. Please try again.");
  }
}

function renderCountry(country, borderLinksHtml) {
  const name = country?.name?.common || "N/A";
  const nativeName = getNativeName(country?.name?.nativeName);
  const population = formatNumber(country?.population);
  const region = country?.region || "N/A";
  const subregion = country?.subregion || "N/A";
  const capital = (country?.capital && country.capital[0]) || "N/A";
  const tld = (country?.tld && country.tld.join(", ")) || "N/A";
  const currencies = getCurrencies(country?.currencies);
  const languages = getLanguages(country?.languages);
  const flagUrl = country?.flags?.svg || country?.flags?.png || "";

  detailsEl.innerHTML = `
    <img class="flag" src="${escapeAttr(flagUrl)}" alt="${escapeAttr(name)} flag" />
    <div class="info">
      <h2>${escapeHtml(name)}</h2>

      <div class="columns">
        <div>
          <p><strong>Native Name:</strong> ${escapeHtml(nativeName)}</p>
          <p><strong>Population:</strong> ${escapeHtml(population)}</p>
          <p><strong>Region:</strong> ${escapeHtml(region)}</p>
          <p><strong>Sub Region:</strong> ${escapeHtml(subregion)}</p>
          <p><strong>Capital:</strong> ${escapeHtml(capital)}</p>
        </div>

        <div>
          <p><strong>Top Level Domain:</strong> ${escapeHtml(tld)}</p>
          <p><strong>Currencies:</strong> ${escapeHtml(currencies)}</p>
          <p><strong>Languages:</strong> ${escapeHtml(languages)}</p>
        </div>
      </div>

      <div class="borders">
        <p class="label"><strong>Border Countries:</strong></p>
        <div class="border-list">
          ${borderLinksHtml || `<span class="meta">None</span>`}
        </div>
      </div>
    </div>
  `;

  // Make border links re-load details without leaving the page
  detailsEl.querySelectorAll("a.border").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const next = a.getAttribute("data-name");
      if (!next) return;
      // update URL (nice UX) then load
      const newUrl = `${window.location.pathname}?name=${encodeURIComponent(next)}`;
      window.history.pushState({}, "", newUrl);
      loadCountryByName(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

async function buildBorders(borderCodes) {
  if (!Array.isArray(borderCodes) || borderCodes.length === 0) return "";

  try {
    // Lookup border countries by ISO codes
    const url = `${API_BASE}/alpha?codes=${borderCodes.join(",")}&fields=name`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) return "";

    // Keep order close to original codes
    const codeToName = new Map();
    for (const c of data) codeToName.set(c?.cca3, c?.name?.common);

    return borderCodes
      .map((code) => {
        const nm = codeToName.get(code) || code;
        return `<a class="border" href="details.html?name=${encodeURIComponent(
          nm
        )}" data-name="${escapeAttr(nm)}">${escapeHtml(nm)}</a>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    // If borders fail, degrade gracefully
    return "";
  }
}

/* ---------------- HELPERS ---------------- */
function setStatus(text) {
  statusEl.textContent = text;
}

function formatNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "N/A";
  return num.toLocaleString();
}

function getNativeName(nativeNameObj) {
  if (!nativeNameObj || typeof nativeNameObj !== "object") return "N/A";
  const firstKey = Object.keys(nativeNameObj)[0];
  if (!firstKey) return "N/A";
  return nativeNameObj[firstKey]?.common || nativeNameObj[firstKey]?.official || "N/A";
}

function getCurrencies(currObj) {
  if (!currObj || typeof currObj !== "object") return "N/A";
  const names = Object.values(currObj)
    .map((c) => c?.name)
    .filter(Boolean);
  return names.length ? names.join(", ") : "N/A";
}

function getLanguages(langObj) {
  if (!langObj || typeof langObj !== "object") return "N/A";
  const langs = Object.values(langObj).filter(Boolean);
  return langs.length ? langs.join(", ") : "N/A";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}

/* Handle browser back/forward */
window.addEventListener("popstate", () => {
  const p = new URLSearchParams(window.location.search);
  const nm = p.get("name");
  if (nm) loadCountryByName(nm);
});

