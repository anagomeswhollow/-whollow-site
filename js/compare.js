// Before/after image slider. Vanilla JS, no dependencies.
// Works with mouse, touch, and keyboard (arrow keys once focused).
// Attaches to every element with class "compare-frame" on the page.

(function () {
  function setupCompare(frame) {
    const handle = frame.querySelector(".compare-handle");
    const reveal = frame.querySelector(".compare-reveal");
    if (!handle || !reveal) return;

    let dragging = false;

    function setPercent(percent) {
      const clamped = Math.max(0, Math.min(100, percent));
      reveal.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
      handle.style.left = `${clamped}%`;
    }

    function percentFromClientX(clientX) {
      const rect = frame.getBoundingClientRect();
      const x = clientX - rect.left;
      return (x / rect.width) * 100;
    }

    function onPointerDown(e) {
      dragging = true;
      frame.setPointerCapture(e.pointerId);
      setPercent(percentFromClientX(e.clientX));
    }

    function onPointerMove(e) {
      if (!dragging) return;
      setPercent(percentFromClientX(e.clientX));
    }

    function onPointerUp(e) {
      dragging = false;
      if (frame.hasPointerCapture && frame.hasPointerCapture(e.pointerId)) {
        frame.releasePointerCapture(e.pointerId);
      }
    }

    frame.addEventListener("pointerdown", onPointerDown);
    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerup", onPointerUp);
    frame.addEventListener("pointercancel", onPointerUp);

    // Keyboard support: make the frame focusable and respond to arrow keys.
    frame.setAttribute("tabindex", "0");
    frame.setAttribute("role", "slider");
    frame.setAttribute("aria-label", "Before and after image comparison");
    frame.setAttribute("aria-valuemin", "0");
    frame.setAttribute("aria-valuemax", "100");

    let current = 50;
    setPercent(current);
    frame.setAttribute("aria-valuenow", "50");

    frame.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        current = Math.max(0, current - 4);
        setPercent(current);
        frame.setAttribute("aria-valuenow", String(Math.round(current)));
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        current = Math.min(100, current + 4);
        setPercent(current);
        frame.setAttribute("aria-valuenow", String(Math.round(current)));
        e.preventDefault();
      }
    });

    // Keep the aria value roughly in sync when dragging with pointer too.
    frame.addEventListener("pointermove", () => {
      const left = parseFloat(handle.style.left) || 0;
      current = left;
      frame.setAttribute("aria-valuenow", String(Math.round(left)));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".compare-frame").forEach(setupCompare);
  });
})();
