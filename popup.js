// popup.js

const input = document.getElementById("siteInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("list");
const empty = document.getElementById("empty");

async function getBlocklist() {
  const { blocklist = [] } = await chrome.storage.local.get("blocklist");
  return blocklist;
}

async function saveBlocklist(blocklist) {
  await chrome.storage.local.set({ blocklist });
  chrome.runtime.sendMessage({ type: "UPDATE_RULES" });
}

function normalizeDomain(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

function render(blocklist) {
  list.innerHTML = "";
  empty.style.display = blocklist.length === 0 ? "block" : "none";
  blocklist.forEach((domain) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${domain}</span><button class="remove" title="Unblock">✕</button>`;
    li.querySelector(".remove").addEventListener("click", async () => {
      const updated = (await getBlocklist()).filter((d) => d !== domain);
      await saveBlocklist(updated);
      render(updated);
    });
    list.appendChild(li);
  });
}

addBtn.addEventListener("click", async () => {
  const domain = normalizeDomain(input.value);
  if (!domain) return;
  const blocklist = await getBlocklist();
  if (!blocklist.includes(domain)) {
    const updated = [...blocklist, domain];
    await saveBlocklist(updated);
    render(updated);
  }
  input.value = "";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addBtn.click();
});

// Init
getBlocklist().then(render);
