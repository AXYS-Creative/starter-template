/* Global - Animate elements when scrolling. Currently offers:
- Scrolling direction (up or down)
- Distance away from page top
- Distance near page bottom
- Consider adding scroll idle?
*/

import { siteHeader } from "./header.js";
import { btnBackToTop } from "../util.js";

let lastScrollY = 0;

window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  let awayFromTop = currentScrollY > 96;
  let scrollingDown = currentScrollY > lastScrollY;
  let nearBottom = currentScrollY + windowHeight >= documentHeight - 296; // Adjust threshold as needed

  if (awayFromTop) {
    siteHeader?.classList.add("site-header--away-from-top");
    btnBackToTop?.classList.add("btn-back-to-top--away-from-top");
  } else {
    siteHeader?.classList.remove("site-header--away-from-top");
    btnBackToTop?.classList.remove("btn-back-to-top--away-from-top");
  }

  if (scrollingDown && awayFromTop) {
    siteHeader.classList.add("site-header--scrolling-down");
  } else {
    siteHeader.classList.remove("site-header--scrolling-down");
  }

  if (nearBottom) {
    siteHeader.classList.add("site-header--near-bottom");
    btnBackToTop?.classList.add("btn-back-to-top--near-bottom");
  } else {
    siteHeader.classList.remove("site-header--near-bottom");
    btnBackToTop?.classList.remove("btn-back-to-top--near-bottom");
  }

  lastScrollY = currentScrollY;
});
