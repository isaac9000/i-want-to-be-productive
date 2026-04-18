// background.js — manages dynamic declarativeNetRequest rules

const BLOCKED_PAGE = chrome.runtime.getURL("blocked.html");

// Rebuild all dynamic rules from stored blocklist
async function updateRules() {
  const { blocklist = [] } = await chrome.storage.local.get("blocklist");

  // Remove all existing dynamic rules
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map((r) => r.id);

  const addRules = blocklist.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: BLOCKED_PAGE },
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "UPDATE_RULES") {
    updateRules().then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async response
  }
});

// Apply rules on startup
updateRules();
