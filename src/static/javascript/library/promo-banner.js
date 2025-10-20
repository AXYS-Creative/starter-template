import { root } from "../util.js";
import { siteHeader, siteNav } from "../global/header.js";

let promoBanner = document.querySelector(".promo-banner");

if (promoBanner) {
  let initialHide = promoBanner.dataset.initialHide || 0;
  let promoBannerHeight = promoBanner.offsetHeight;

  root.style.setProperty("--promo-banner-height", `${promoBannerHeight}px`);

  if (initialHide > 0) {
    promoBanner.setAttribute("aria-hidden", true);
    promoBanner.setAttribute("tabindex", -1);
    // root.style.setProperty("--promo-banner-height", "0");

    setTimeout(() => {
      promoBanner.setAttribute("aria-hidden", false);
      promoBanner.setAttribute("tabindex", 0);
      // root.style.setProperty("--promo-banner-height", `${promoBannerHeight}px`);
      promoBanner.classList.add("promo-banner--reveal");

      // aria-live: re-assign text so it's treated as new
      const msg = promoBanner.querySelector(".promo-banner__message");
      if (msg) msg.textContent = msg.textContent;

      // Modify header based on promo banner
      siteHeader.classList.add("site-header--promo-banner");
      siteNav.classList.add("site-nav--promo-banner");
    }, initialHide);
  }

  // Close on click
  if (promoBanner.classList.contains("promo-banner--close-on-click")) {
    promoBanner.addEventListener("click", () => {
      promoBanner.classList.remove("promo-banner--reveal");
      promoBanner.classList.add("promo-banner--closed");
      promoBanner.setAttribute("aria-hidden", true);
      promoBanner.setAttribute("tabindex", -1);
      // root.style.setProperty("--promo-banner-height", "0");
      siteHeader.classList.remove("site-header--promo-banner");
      siteNav.classList.remove("site-nav--promo-banner");
    });
  }
}
