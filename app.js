/* LensLoft — browser photo booth
 * Vanilla JS. Camera stays local; nothing is uploaded.
 * Live filters are drawn to a <canvas> each animation frame so the
 * preview and the captured photo always match.
 */
(() => {
  "use strict";

  // ---- Elements ----
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const booth = document.querySelector(".booth");
  const stageIdle = document.getElementById("stageIdle");
  const flash = document.getElementById("flash");
  const countdownEl = document.getElementById("countdown");
  const filterChip = document.getElementById("filterChip");
  const filterGrid = document.getElementById("filterGrid");
  const shots = document.getElementById("shots");
  const shotCount = document.getElementById("shotCount");

  const startBtn = document.getElementById("startBtn");
  const enableBtn = document.getElementById("enableBtn");
  const shutterBtn = document.getElementById("shutterBtn");
  const surpriseBtn = document.getElementById("surpriseBtn");
  const stripBtn = document.getElementById("stripBtn");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const clearBtn = document.getElementById("clearBtn");
  const notifyBtn = document.getElementById("notifyBtn");
  const liveCount = document.getElementById("liveCount");

  // ---- Filters: name, emoji, and how to render ----
  // `css` applies via ctx.filter. `special` runs custom pixel work.
  // A theme page can rename/re-icon any filter by setting
  // window.LENSLOFT_LABELS = { <id>: { name, emoji } } before this script.
  const BASE_FILTERS = [
    { id: "none",      name: "None",      emoji: "⚪", css: "none" },
    { id: "mono",      name: "Mono",      emoji: "🖤", css: "grayscale(1) contrast(1.1)" },
    { id: "retro",     name: "Retro",     emoji: "🎞️", css: "sepia(.7) contrast(1.1) saturate(1.3)" },
    { id: "vapor",     name: "Vaporwave", emoji: "🌴", css: "hue-rotate(260deg) saturate(1.8) contrast(1.1)" },
    { id: "neon",      name: "Neon",      emoji: "✨", css: "saturate(2.2) contrast(1.4) brightness(1.1)" },
    { id: "frost",     name: "Frost",     emoji: "❄️", css: "hue-rotate(170deg) brightness(1.15) saturate(1.2)" },
    { id: "noir",      name: "Noir",      emoji: "🕶️", css: "grayscale(1) contrast(1.6) brightness(.9)" },
    { id: "sunset",    name: "Sunset",    emoji: "🌅", css: "sepia(.4) hue-rotate(-20deg) saturate(1.6) contrast(1.1)" },
    { id: "invert",    name: "Invert",    emoji: "🔀", css: "invert(1)" },
    { id: "dream",     name: "Dream",     emoji: "💭", css: "blur(1.2px) brightness(1.1) saturate(1.3)" },
    { id: "pixel",     name: "Pixelate",  emoji: "🟦", css: "none", special: "pixel" },
    { id: "thermal",   name: "Thermal",   emoji: "🔥", css: "none", special: "thermal" },
  ];

  const LABELS = window.LENSLOFT_LABELS || null;
  const FILTERS = LABELS
    ? BASE_FILTERS.map((f) => ({
        ...f,
        name: (LABELS[f.id] && LABELS[f.id].name) || f.name,
        emoji: (LABELS[f.id] && LABELS[f.id].emoji) || f.emoji,
      }))
    : BASE_FILTERS;

  let current = FILTERS[0];
  let stream = null;
  let rafId = null;

  // ---- Build filter tiles ----
  FILTERS.forEach((f) => {
    const tile = document.createElement("button");
    tile.className = "filter-tile" + (f.id === "none" ? " active" : "");
    tile.dataset.id = f.id;
    tile.innerHTML = `<span class="filter-emoji">${f.emoji}</span><span>${f.name}</span>`;
    tile.addEventListener("click", () => setFilter(f.id));
    filterGrid.appendChild(tile);
  });

  function setFilter(id) {
    current = FILTERS.find((f) => f.id === id) || FILTERS[0];
    filterChip.textContent = "Filter: " + current.name;
    document.querySelectorAll(".filter-tile").forEach((t) =>
      t.classList.toggle("active", t.dataset.id === id)
    );
  }

  // ---- Camera ----
  async function enableCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      booth.classList.add("live");
      stageIdle.style.display = "none";
      shutterBtn.disabled = false;
      stripBtn.disabled = false;
      sizeCanvas();
      renderLoop();
    } catch (err) {
      stageIdle.querySelector("h3").textContent = "Couldn't open the camera";
      stageIdle.querySelector("p").textContent =
        "Permission was blocked or no camera was found. Check the browser's site settings and try again.";
      console.warn("getUserMedia failed:", err);
    }
  }

  function sizeCanvas() {
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 960;
    canvas.width = w;
    canvas.height = h;
  }

  // ---- Live render loop (mirrored so it reads like a selfie) ----
  function renderLoop() {
    if (!stream) return;
    if (!canvas.width && video.videoWidth) sizeCanvas();
    drawFrame(ctx, canvas.width, canvas.height);
    rafId = requestAnimationFrame(renderLoop);
  }

  function drawFrame(c, w, h) {
    c.save();
    c.filter = current.css || "none";
    // mirror horizontally
    c.translate(w, 0);
    c.scale(-1, 1);

    if (current.special === "pixel") {
      const scale = 0.08;
      c.imageSmoothingEnabled = false;
      c.drawImage(video, 0, 0, w * scale, h * scale);
      c.drawImage(canvas, 0, 0, w * scale, h * scale, 0, 0, w, h);
      c.imageSmoothingEnabled = true;
    } else {
      c.drawImage(video, 0, 0, w, h);
    }
    c.restore();

    if (current.special === "thermal") applyThermal(c, w, h);
  }

  // Thermal: map luminance to a heat gradient.
  function applyThermal(c, w, h) {
    const img = c.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const t = lum / 255;
      d[i] = Math.min(255, t * 2 * 255);                 // R
      d[i + 1] = Math.min(255, Math.abs(t - 0.5) * 2 * 160); // G
      d[i + 2] = Math.min(255, (1 - t) * 255);           // B
    }
    c.putImageData(img, 0, 0);
  }

  // ---- Capture ----
  const gallery = [];

  function capture() {
    // Freeze the current canvas content into a photo.
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    out.getContext("2d").drawImage(canvas, 0, 0);
    const url = out.toDataURL("image/png");
    gallery.push(url);
    addThumb(url);
    refreshGalleryControls();
  }

  function addThumb(url) {
    if (gallery.length === 1) shots.innerHTML = "";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Your photo";
    img.addEventListener("click", () => downloadOne(url, gallery.indexOf(url)));
    shots.appendChild(img);
    shotCount.textContent = `(${gallery.length})`;
  }

  function refreshGalleryControls() {
    const has = gallery.length > 0;
    downloadAllBtn.disabled = !has;
    clearBtn.disabled = !has;
  }

  function countdownThen(cb, n = 3) {
    let i = n;
    const tick = () => {
      countdownEl.textContent = i;
      countdownEl.classList.remove("go");
      void countdownEl.offsetWidth; // restart animation
      countdownEl.classList.add("go");
      if (i === 0) {
        fireFlash();
        cb();
        return;
      }
      i--;
      setTimeout(tick, 900);
    };
    tick();
  }

  function fireFlash() {
    flash.classList.remove("go");
    void flash.offsetWidth;
    flash.classList.add("go");
  }

  async function shootStrip() {
    shutterBtn.disabled = true;
    stripBtn.disabled = true;
    for (let s = 0; s < 4; s++) {
      await new Promise((res) => countdownThen(() => { capture(); res(); }, 3));
      await new Promise((r) => setTimeout(r, 500));
    }
    shutterBtn.disabled = false;
    stripBtn.disabled = false;
  }

  // ---- Downloads ----
  function downloadOne(url, idx) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `lensloft-${String(idx + 1).padStart(2, "0")}.png`;
    a.click();
  }
  function downloadAll() {
    gallery.forEach((url, i) => setTimeout(() => downloadOne(url, i), i * 250));
  }
  function clearGallery() {
    gallery.length = 0;
    shots.innerHTML =
      '<p class="empty">Your photos show up here. Download or clear them any time — nothing is uploaded.</p>';
    shotCount.textContent = "(0)";
    refreshGalleryControls();
  }

  // ---- Notifications (natural secondary permission for the lab) ----
  async function askNotify() {
    if (!("Notification" in window)) {
      notifyBtn.textContent = "Not supported here";
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      notifyBtn.textContent = "✓ Alerts on";
      notifyBtn.disabled = true;
      new Notification("LensLoft", { body: "You're in! We'll ping you when Friday's filter drops. 🎉" });
    } else {
      notifyBtn.textContent = "Maybe later";
    }
  }

  // ---- "Live" social-proof counter (cosmetic) ----
  (function liveTicker() {
    let n = 180 + Math.floor(Math.random() * 120);
    liveCount.textContent = n;
    setInterval(() => {
      n += Math.floor(Math.random() * 7) - 3;
      if (n < 120) n = 120;
      liveCount.textContent = n;
    }, 2500);
  })();

  // ---- Wiring ----
  const scrollToBooth = () =>
    document.getElementById("booth").scrollIntoView({ behavior: "smooth" });

  startBtn.addEventListener("click", scrollToBooth);
  enableBtn.addEventListener("click", enableCamera);
  shutterBtn.addEventListener("click", () => countdownThen(capture, 3));
  stripBtn.addEventListener("click", shootStrip);
  surpriseBtn.addEventListener("click", () => {
    const pick = FILTERS[1 + Math.floor(Math.random() * (FILTERS.length - 1))];
    setFilter(pick.id);
  });
  downloadAllBtn.addEventListener("click", downloadAll);
  clearBtn.addEventListener("click", clearGallery);
  notifyBtn.addEventListener("click", askNotify);

  // Stop the camera cleanly if the tab is hidden for a long time? Keep it
  // simple for the demo: release tracks on unload.
  window.addEventListener("beforeunload", () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (rafId) cancelAnimationFrame(rafId);
  });
})();
