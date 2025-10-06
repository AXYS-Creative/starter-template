/* Global - Animate elements when scrolling. Currently offers:
- Scrolling direction (up or down)
- Distance away from page top
- Distance near page bottom
- Consider adding scroll idle?
*/

import { siteHeader } from "./header.js";
import { btnBackToTop } from "../util.js";

// Library (plan-selection.njk)
const planSelectionToggle = document.querySelector(
  ".plan-selection__toggle-wrapper"
);

let lastScrollY = 0;

function isElementNearTop(el, offset = 16) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.top <= offset && rect.bottom > offset;
}

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
    planSelectionToggle?.classList.add(
      "plan-selection__toggle-wrapper--scrolling-down"
    );
  } else {
    siteHeader.classList.remove("site-header--scrolling-down");

    if (isElementNearTop(planSelectionToggle, 32)) {
      planSelectionToggle?.classList.remove(
        "plan-selection__toggle-wrapper--scrolling-down"
      );
    }
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
