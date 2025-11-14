export const root = document.documentElement; // See portfolio for examples

export const mqMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
export const mqMotionAllow = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
export const mqNoMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const mqMaxLg = window.matchMedia("(max-width: 1024px)").matches;
export const mqMinLg = window.matchMedia("(min-width: 1025px)").matches;
export const mqMaxMd = window.matchMedia("(max-width: 768px)").matches;

// Remember to add 'data-lenis-prevent' to any that should scroll normally
export const lenis = new Lenis({
  autoRaf: true,
});

//
// Library DELETE ME
//

// Global config shared everywhere
export const globalConfig = {
  // loadDuration: 3.2, // global loader, in seconds (not ms)
  loadDuration: 0, // global loader, in seconds (not ms)
};

// Cubic-bezier - Lenis helper
export const cubicBezier = (p0, p1, p2, p3) => {
  // Polyfill-like implementation of bezier easing
  return (t) => {
    const cx = 3 * p0;
    const bx = 3 * (p2 - p0) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * p1;
    const by = 3 * (p3 - p1) - cy;
    const ay = 1 - cy - by;

    const bezierX = (t) => ((ax * t + bx) * t + cx) * t;
    const bezierY = (t) => ((ay * t + by) * t + cy) * t;

    // Newton-Raphson to solve for t from x
    let x = t,
      i = 0;
    for (; i < 5; i++) {
      const x2 = bezierX(x) - t;
      if (Math.abs(x2) < 1e-4) break;
      const d2 = (3 * ax * x + 2 * bx) * x + cx;
      if (Math.abs(d2) < 1e-4) break;
      x -= x2 / d2;
    }
    return bezierY(x);
  };
};

// Back to top
export const btnBackToTop = document.querySelector(".btn-back-to-top"); // floating page button
{
  const returnToTop = document.querySelectorAll(".back-to-top"),
    logo = document.querySelector(".site-header .site-logo");

  const customEase = cubicBezier(0.6, 0, 0.25, 1);

  returnToTop.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();

      lenis.scrollTo(0, {
        duration: 1.5,
        easing: customEase,
      });

      logo.focus({ preventScroll: true });
    });
  });
}

// Browser Check
export const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome");
};

document.addEventListener("DOMContentLoaded", () => {
  if (isSafari()) document.documentElement.dataset.browser = "safari";
});

// Dynamic update current year
{
  const currentYear = new Date().getFullYear();
  const currentYearElements = document.querySelectorAll("[data-current-year]");

  currentYearElements.forEach((currentYearElement) => {
    currentYearElement.textContent = currentYear;
    currentYearElement.setAttribute("datetime", currentYear);
  });
}

// Dropbox video url fix
{
  document.querySelectorAll("video").forEach((vid) => {
    const src = vid.getAttribute("src");

    if (src && src.includes("dropbox")) {
      const updatedSrc = src.replace("dl=0", "raw=1");
      vid.setAttribute("src", updatedSrc);
    }
  });
}

// Skip to main content option (for lenghthy headers)
{
  const skipToContent = document.querySelector(".skip-to-content"),
    contentStart = document.querySelector("#content-start");

  if (skipToContent) {
    skipToContent.addEventListener("click", () => {
      contentStart?.focus();
    });
  }
}

// CSS Util for .btn--split-text
{
  document.querySelectorAll(".btn--split-text").forEach((el) => {
    // Decide what to target
    const target = el.classList.contains("btn") ? el.querySelector(".btn__text") : el;

    if (!target) return;

    const text = target.textContent.trim();

    // Add aria-label for screen readers
    target.setAttribute("aria-label", text);

    // Build split markup (visually hidden from screen readers)
    const splitHTML =
      `<span class="btn--split-text__content" aria-hidden="true">` +
      Array.from(text)
        .map((char) => {
          if (char === " ") {
            return `<span class="letter-group space"> </span>`;
          }
          return `
            <span class="letter-group">
              <span class="letter" data-char="${char}">${char}</span>
            </span>
          `;
        })
        .join("") +
      `</span>`;

    // Replace only the text node inside the target, not the whole element
    target.innerHTML = splitHTML;
  });
}

// Polyfill for lvh, and svh. They all seemed to be dvh.
const setViewportUnits = (() => {
  const innerHeight = window.innerHeight;
  const lvhOffset = 64; // Mobile browser UI height (eyeballing)

  root.style.setProperty("--lvh", `${(innerHeight + lvhOffset) * 0.01}px`);
  root.style.setProperty("--svh", `${innerHeight * 0.01}px`);
})();

//
// Title change on tab move
//
{
  const originalTitle = document.title;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      document.title = "👋 Hey, come back!";
    } else {
      document.title = originalTitle;
    }
  });
}

console.clear();
console.log("visit axyscreative.com for more info");
