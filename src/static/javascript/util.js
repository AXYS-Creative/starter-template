export const root = document.documentElement; // See portfolio for examples

export const mqMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
export const mqMotionAllow = window.matchMedia(
  "(prefers-reduced-motion: no-preference)"
);
export const mqMaxLg = window.matchMedia("(max-width: 1024px)").matches;
export const mqMinLg = window.matchMedia("(min-width: 1025px)").matches;

export const lenis = new Lenis({
  autoRaf: true,
});

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

// Theme swap
if (document.querySelector(".theme-swap")) {
  console.log("Theme swap enabled");
}

// Detect Safari Browser
export const isSafari = () => {
  let ua = navigator.userAgent.toLowerCase();
  return ua.indexOf("safari") !== -1 && ua.indexOf("chrome") === -1;
};

// console.clear();
console.log("visit axyscreative.com for more info");
