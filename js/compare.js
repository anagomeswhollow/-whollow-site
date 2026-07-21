// Before/after image slider. Vanilla JS, no dependencies.
// Works with mouse, touch, and keyboard (arrow keys once focused).
// Attaches to every element with class "compare-frame" on the page.
//
// Interaction model:
//   - Drag the handle (or drag anywhere in the frame) to move the
//     before/after split.
//   - A plain click/tap (no real movement) opens whichever image is
//     under the pointer full-screen in the lightbox, for a closer look.

(function () {
  const DRAG_THRESHOLD = 6; // px of movement before a pointerdown counts as a drag, not a click

  function setupCompare(frame) {
    const handle = frame.querySelector(".compare-handle");
    const reveal = frame.querySelector(".compare-reveal");
    const base = frame.querySelector(".compare-base");
    if (!handle || !reveal) return;

    let current = 50;
    let dragging = false;
    let moved = false;
    let downX = null;
    let downY = null;

    function setPercent(percent) {
      const clamped = Math.max(0, Math.min(100, percent));
      // Left of the handle = before (base layer shows through),
      // right of the handle = after (reveal layer visible) --
      // matching the fixed Before/After corner labels.
      reveal.style.clipPath = `inset(0 0 0 ${clamped}%)`;
      handle.style.left = `${clamped}%`;
      return clamped;
    }

    function percentFromClientX(clientX) {
      const rect = frame.getBoundingClientRect();
      const x = clientX - rect.left;
      return (x / rect.width) * 100;
    }

    function openImageAt(clientX) {
      const pct = percentFromClientX(clientX);
      const img = pct > current ? reveal : base;
      if (img && img.tagName === "IMG" && window.openLightbox) {
        window.openLightbox(img.src, img.alt);
      }
    }

    current = setPercent(current);

    function onPointerDown(e) {
      moved = false;
      dragging = false;
      downX = e.clientX;
      downY = e.clientY;
      frame.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (downX === null) return;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (!moved && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        moved = true;
        dragging = true;
      }
      if (dragging) {
        current = setPercent(percentFromClientX(e.clientX));
        frame.setAttribute("aria-valuenow", String(Math.round(current)));
      }
    }

    function onPointerUp(e) {
      if (frame.hasPointerCapture && frame.hasPointerCapture(e.pointerId)) {
        frame.releasePointerCapture(e.pointerId);
      }
      if (!moved) {
        openImageAt(e.clientX);
      }
      dragging = false;
      downX = null;
      downY = null;
    }

    frame.addEventListener("pointerdown", onPointerDown);
    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerup", onPointerUp);
    frame.addEventListener("pointercancel", onPointerUp);

    // Keyboard support: make the frame focusable and respond to arrow keys.
    frame.setAttribute("tabindex", "0");
    frame.setAttribute("role", "slider");
    frame.setAttribute("aria-label", "Before and after image comparison. Drag to compare, press Enter to view full screen.");
    frame.setAttribute("aria-valuemin", "0");
    frame.setAttribute("aria-valuemax", "100");
    frame.setAttribute("aria-valuenow", "50");

    frame.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        current = setPercent(Math.max(0, current - 4));
        frame.setAttribute("aria-valuenow", String(Math.round(current)));
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        current = setPercent(Math.min(100, current + 4));
        frame.setAttribute("aria-valuenow", String(Math.round(current)));
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        const img = current >= 50 ? reveal : base;
        if (img && img.tagName === "IMG" && window.openLightbox) {
          window.openLightbox(img.src, img.alt);
        }
        e.preventDefault();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".compare-frame").forEach(setupCompare);
  });
})();
