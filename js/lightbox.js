// Full-screen image viewer. Call window.openLightbox(src, alt) from
// anywhere to show an image full-screen; click the backdrop, click the
// close button, or press Escape to dismiss it.

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("lightbox");
    if (!overlay) return;
    const imgEl = document.getElementById("lightboxImg");
    const closeBtn = overlay.querySelector(".lightbox-close");
    let lastFocused = null;

    function open(src, alt) {
      if (!src) return;
      lastFocused = document.activeElement;
      imgEl.src = src;
      imgEl.alt = alt || "";
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-locked");
      closeBtn.focus();
    }

    function close() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-locked");
      imgEl.src = "";
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    window.openLightbox = open;

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
  });
})();
