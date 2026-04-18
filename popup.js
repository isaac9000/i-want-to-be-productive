// popup.js

const input = document.getElementById("siteInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("list");
const empty = document.getElementById("empty");
const redirectToggle = document.getElementById("redirectToggle");
const redirectUrlInput = document.getElementById("redirectUrl");
const redirectStatus = document.getElementById("redirectStatus");

// ── Storage helpers ──────────────────────────────────────────────────────────

async function getBlocklist() {
  const { blocklist = [] } = await chrome.storage.local.get("blocklist");
  return blocklist;
}

// blocklistMeta: { [domain]: isoDateString } — records when each domain was added
async function getMeta() {
  const { blocklistMeta = {} } = await chrome.storage.local.get("blocklistMeta");
  return blocklistMeta;
}

async function saveBlocklist(blocklist, meta) {
  await chrome.storage.local.set({ blocklist, blocklistMeta: meta });
  chrome.runtime.sendMessage({ type: "UPDATE_RULES" });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDomain(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

function normalizeUrl(raw) {
  raw = raw.trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  try { new URL(raw); return raw; } catch { return ""; }
}

function daysSince(isoDate) {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function dayLabel(n) {
  return `${n} day${n !== 1 ? "s" : ""}`;
}

// ── Render ───────────────────────────────────────────────────────────────────

function render(blocklist, meta) {
  list.innerHTML = "";
  empty.style.display = blocklist.length === 0 ? "block" : "none";

  blocklist.forEach((domain) => {
    const since = meta[domain] || new Date().toISOString();
    const days  = daysSince(since);

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="li-main">
        <span class="domain">${domain}</span>
        <span class="days-badge" title="Blocked since ${new Date(since).toLocaleDateString()}">
           ${dayLabel(days)}
        </span>
      </div>
      <button class="remove" title="Unblock">✕</button>
    `;
    li.querySelector(".remove").addEventListener("click", async () => {
      const [bl, m] = [await getBlocklist(), await getMeta()];
      const updated = bl.filter((d) => d !== domain);
      const updatedMeta = { ...m };
      delete updatedMeta[domain];
      await saveBlocklist(updated, updatedMeta);
      render(updated, updatedMeta);
    });
    list.appendChild(li);
  });
}

// ── Redirect settings ────────────────────────────────────────────────────────

async function loadRedirectSettings() {
  const { redirectEnabled = false, redirectUrl = "" } =
    await chrome.storage.local.get(["redirectEnabled", "redirectUrl"]);
  redirectToggle.checked = redirectEnabled;
  redirectUrlInput.value = redirectUrl;
  updateRedirectUI(redirectEnabled);
}

function updateRedirectUI(enabled) {
  redirectUrlInput.disabled = !enabled;
  redirectStatus.textContent = enabled ? "ON" : "OFF";
  redirectStatus.className = "redirect-status " + (enabled ? "on" : "off");
}

redirectToggle.addEventListener("change", async () => {
  const enabled = redirectToggle.checked;
  updateRedirectUI(enabled);
  const url = normalizeUrl(redirectUrlInput.value);
  if (enabled) redirectUrlInput.value = url;
  await chrome.storage.local.set({ redirectEnabled: enabled, redirectUrl: url });
  chrome.runtime.sendMessage({ type: "UPDATE_RULES" });
});

redirectUrlInput.addEventListener("change", async () => {
  const url = normalizeUrl(redirectUrlInput.value);
  redirectUrlInput.value = url;
  await chrome.storage.local.set({ redirectUrl: url });
  chrome.runtime.sendMessage({ type: "UPDATE_RULES" });
});

// ── Add site ─────────────────────────────────────────────────────────────────

addBtn.addEventListener("click", async () => {
  const domain = normalizeDomain(input.value);
  if (!domain) return;
  const [blocklist, meta] = [await getBlocklist(), await getMeta()];
  if (!blocklist.includes(domain)) {
    const updated     = [...blocklist, domain];
    const updatedMeta = { ...meta, [domain]: new Date().toISOString() };
    await saveBlocklist(updated, updatedMeta);
    render(updated, updatedMeta);
  }
  input.value = "";
});

input.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });

// ── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  const [blocklist, meta] = [await getBlocklist(), await getMeta()];
  render(blocklist, meta);
  loadRedirectSettings();
})();
