export const root = document.documentElement; // See portfolio for examples

export const mqMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
export const mqMotionAllow = window.matchMedia(
  "(prefers-reduced-motion: no-preference)"
);
export const mqMaxLg = window.matchMedia("(max-width: 1024px)").matches;
export const mqMinLg = window.matchMedia("(min-width: 1025px)").matches;
export const mqMaxMd = window.matchMedia("(max-width: 768px)").matches;
export const mqNoMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// Remember to add 'data-lenis-prevent' to any that should scroll normally
export const lenis = new Lenis({
  autoRaf: true,
});

//
// Library DELETE ME
//

// Buttons
{
  const playButtons = document.querySelectorAll(".btn-play");

  playButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("clicked the button");
      const isPressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", !isPressed);
    });
  });
}

// Dynamic update current year
{
  const currentYear = new Date().getFullYear();
  const currentYearElements = document.querySelectorAll("[data-current-year]");

  currentYearElements.forEach((currentYearElement) => {
    currentYearElement.textContent = currentYear;
    currentYearElement.setAttribute("datetime", currentYear);
  });
}

// Return to top
{
  const returnToTop = document.querySelectorAll(".return-to-top"),
    logo = document.querySelector(".header-logo");

  returnToTop.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();

      lenis.scrollTo(0, {
        duration: 1.2,
        easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
      });

      // Restore focus for accessibility
      logo.focus({ preventScroll: true });
    });
  });
}

// Skip to main content option (for lenghthy headers)
const skipToContent = document.querySelector(".skip-to-content"),
  contentStart = document.querySelector(".content-start");

if (skipToContent) {
  skipToContent.addEventListener("click", () => {
    contentStart?.focus();
  });
}

// CSS Util for .link--split-text
{
  document.querySelectorAll(".link--split-text").forEach((el) => {
    // Decide what to target
    const target = el.classList.contains("link")
      ? el.querySelector(".link__text")
      : el;

    if (!target) return;

    const text = target.textContent;

    // Build split markup
    const splitHTML =
      `<span class="link--split-text__content">` +
      Array.from(text)
        .map((char) => {
          if (char === " ") {
            return `<span class="letter-group space" aria-hidden="true"> </span>`;
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

// Detect Safari Browser
export const isSafari = () => {
  let ua = navigator.userAgent.toLowerCase();
  return ua.indexOf("safari") !== -1 && ua.indexOf("chrome") === -1;
};

// Polyfill for lvh, and svh. They all seemed to be dvh.
const setViewportUnits = (() => {
  const innerHeight = window.innerHeight;
  const lvhOffset = 64; // Mobile browser UI height (eyeballing)

  root.style.setProperty("--lvh", `${(innerHeight + lvhOffset) * 0.01}px`);
  root.style.setProperty("--svh", `${innerHeight * 0.01}px`);
})();

// console.clear();
console.log("visit axyscreative.com for more info");
