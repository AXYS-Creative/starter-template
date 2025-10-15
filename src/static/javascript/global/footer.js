//
// footer-scroll-reveal.njk
//
import { root } from "../util.js";

const footerScrollReveal = document.querySelector(".footer-scroll-reveal");

if (footerScrollReveal) {
  const footerHeight = footerScrollReveal.getBoundingClientRect().height;
  root.style.setProperty("--footer-height", `${footerHeight}px`);

  const footerInner = footerScrollReveal.querySelector(
    ".footer-scroll-reveal__inner"
  );
  // Manually declare last section
  const lastSection = document.querySelector(
    '[class*="main-"] > .last-section'
  );
  // Should work in most cases
  const lastSectionFallback = document.querySelector(
    '[class*="main-"] > *:last-child'
  );

  gsap.registerPlugin(ScrollTrigger);

  gsap.from(footerInner, {
    y: 320,
    scale: 0.8,
    ease: "linear",
    scrollTrigger: {
      trigger: lastSection || lastSectionFallback,
      start: "top bottom",
      end: `bottom bottom-=${footerHeight}`, // Also read as calc(100% - footerHeight)
      scrub: true,
      // markers: true,
    },
  });
}
