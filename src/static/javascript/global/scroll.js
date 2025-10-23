// Global scroll utility —
// Add 'watch-scroll' to any element to monitor scroll position
// Optional data attributes:
//  - data-scroll-idle="500"      → custom idle timeout (ms)
//  - data-scroll-when="in-view"  → only active modifiers when visible in viewport
//  - data-scroll-when="near-top" → only active modifiers when near top of viewport

let watched = Array.from(document.querySelectorAll(".watch-scroll"));
let lastScrollY = 0;
let ticking = false;
let scrollTimeouts = new WeakMap();

function isInViewport(el, threshold = 0) {
  const rect = el.getBoundingClientRect();
  return rect.bottom > threshold && rect.top < window.innerHeight - threshold;
}

function isNearTop(el, offset = 64) {
  const rect = el.getBoundingClientRect();
  return rect.top <= offset && rect.bottom > 0;
}

function updateScrollState() {
  const currentScrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  const scrollingDown = currentScrollY > lastScrollY;
  const awayFromTop = currentScrollY > 96;
  const nearBottom = currentScrollY + windowHeight >= documentHeight - 296;

  watched.forEach((el) => {
    const when = el.dataset.scrollWhen || "always";
    let isActive = true;

    // --- Determine if element should be "watched" right now
    if (when === "in-view") {
      isActive = isInViewport(el, 32);
    } else if (when === "near-top") {
      isActive = isNearTop(el, 96);
    }

    if (!isActive) {
      // Remove all watch modifiers if inactive
      el.classList.remove(
        "watch-scroll--away-from-top",
        "watch-scroll--scrolling-down",
        "watch-scroll--near-bottom",
        "watch-scroll--idle"
      );
      return; // skip further logic
    }

    // --- Apply core scroll state classes
    el.classList.toggle("watch-scroll--away-from-top", awayFromTop);
    el.classList.toggle("watch-scroll--scrolling-down", scrollingDown && awayFromTop);
    el.classList.toggle("watch-scroll--near-bottom", nearBottom);
    el.classList.remove("watch-scroll--idle");

    // --- Handle per-element idle timing
    if (scrollTimeouts.has(el)) clearTimeout(scrollTimeouts.get(el));

    const idleDelay = parseInt(el.dataset.scrollIdle, 10) || 150;

    const timeout = setTimeout(() => {
      el.classList.add("watch-scroll--idle");
      scrollTimeouts.delete(el);
    }, idleDelay);

    scrollTimeouts.set(el, timeout);
  });

  lastScrollY = currentScrollY;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateScrollState();
      ticking = false;
    });
    ticking = true;
  }
});
