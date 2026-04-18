// blocked.js

const urlEl = document.getElementById("url");
const ref = document.referrer;
if (ref) {
  urlEl.textContent = ref;
  urlEl.style.display = "inline-block";
}

document.getElementById("backBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GO_BACK" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      // Fallback if the background worker is completely dead
      window.location.href = "chrome://newtab/";
    }
  });
});
