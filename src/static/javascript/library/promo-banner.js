import { root } from "../util.js";
import { siteHeader } from "../global/header.js";

let promoBanner = document.querySelector(".promo-banner");

if (promoBanner) {
  let initialHide = promoBanner.dataset.initialHide || 0;
  let promoBannerHeight = promoBanner.getBoundingClientRect().height;

  root.style.setProperty("--promo-banner-height", `${promoBannerHeight}px`);

  setTimeout(() => {
    promoBanner.classList.add("promo-banner--reveal");
    siteHeader.classList.add("site-header--promo-banner");
  }, initialHide);
}
