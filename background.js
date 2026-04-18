// background.js — manages dynamic declarativeNetRequest rules

const BLOCKED_PAGE = chrome.runtime.getURL("blocked.html");

// Watch every tab URL change and record the last URL that isn't blocked
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  const url = changeInfo.url;
  if (!url) return;

  // Ignore our own blocked page
  if (url.startsWith(BLOCKED_PAGE)) return;

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch (err) {
    return;
  }

  const { blocklist = [] } = await chrome.storage.local.get("blocklist");

  const wouldBeBlocked = blocklist.some((domain) => hostname.includes(domain));
  if (wouldBeBlocked) return;

  // This is a confirmed safe URL — remember it in session storage
  await chrome.storage.session.set({ [`safeUrl_${tabId}`]: url });
});

// Clean up memory when a tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`safeUrl_${tabId}`);
});

// Rebuild all dynamic rules from stored blocklist
async function updateRules() {
  const {
    blocklist = [],
    redirectEnabled = false,
    redirectUrl = "",
  } = await chrome.storage.local.get(["blocklist", "redirectEnabled", "redirectUrl"]);

  // Decide where blocked sites should land
  const useCustomRedirect = redirectEnabled && redirectUrl && isValidHttpUrl(redirectUrl);
  const destination = useCustomRedirect ? redirectUrl : BLOCKED_PAGE;

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map((r) => r.id);

  const addRules = blocklist.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: destination },
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame"],
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules,
  });
}

function isValidHttpUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "UPDATE_RULES") {
    updateRules().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "GO_BACK") {
    (async () => {
      try {
        const tabId = sender.tab?.id;
        if (tabId != null) {
          const key = `safeUrl_${tabId}`;
          const data = await chrome.storage.session.get(key);
          const dest = data[key] || "chrome://newtab/";
          await chrome.tabs.update(tabId, { url: dest });
        }
      } catch (error) {
        console.error("Navigation failed:", error);
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
});

// Apply rules on startup
updateRules();
