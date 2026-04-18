// blocked.js

const urlEl = document.getElementById("url");
const ref = document.referrer;
if (ref) {
  urlEl.textContent = ref;
  urlEl.style.display = "inline-block";
}

// Check for a custom redirect destination passed as ?dest=
const params = new URLSearchParams(location.search);
const dest = params.get("dest");

if (dest) {
  const redirectWrap = document.getElementById("redirectWrap");
  const progressBar  = document.getElementById("progressBar");
  const timerEl      = document.getElementById("redirectTimer");

  redirectWrap.style.display = "block";

  // Tick the label every 100ms for a smooth decimal countdown
  const DURATION = 2000;
  const started  = Date.now();

  const tick = setInterval(() => {
    const elapsed   = Date.now() - started;
    const remaining = Math.max(0, (DURATION - elapsed) / 1000);
    timerEl.textContent = remaining.toFixed(1) + "s";
    if (elapsed >= DURATION) clearInterval(tick);
  }, 100);

  // Shrink the bar via CSS transition (defer one double-rAF so it actually animates)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progressBar.style.width = "0%";
    });
  });

  setTimeout(() => {
    clearInterval(tick);
    window.location.href = dest;
  }, DURATION);
}

document.getElementById("backBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GO_BACK" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      window.location.href = "chrome://newtab/";
    }
  });
});
