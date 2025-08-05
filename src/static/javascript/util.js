export const root = document.documentElement; // See portfolio for examples

export const mqMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
export const mqMotionAllow = window.matchMedia(
  "(prefers-reduced-motion: no-preference)"
);
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

// Get current year for copyright
{
  const yearText = document.querySelector(".year-text");
  const currentYear = new Date().getFullYear();

  if (yearText) {
    yearText.innerHTML = currentYear;
    yearText.setAttribute("datetime", currentYear);
  }
}

// Return to top
{
  const returnToTop = document.querySelector(".return-to-top"),
    logo = document.querySelector(".header-logo");

  if (returnToTop) {
    returnToTop.addEventListener("click", (e) => {
      logo.focus();
    });
  }
}

// CSS Util for .split-link
{
  document.querySelectorAll(".split-link").forEach((el) => {
    const text = el.textContent;

    // Wrap all letter groups inside a single span with the class "text-content"
    el.innerHTML =
      `<span class="split-link__content">` +
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
