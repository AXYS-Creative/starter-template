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
  const lastSection = document.querySelector('[class*="main-"] > *:last-child');

  gsap.registerPlugin(ScrollTrigger);

  gsap.from(footerInner, {
    y: 420,
    ease: "linear",
    scrollTrigger: {
      trigger: lastSection,
      start: "top bottom",
      end: `bottom bottom-=${footerHeight}`, // Also read as "bottom calc(100% - footerHeight)"
      scrub: true,
    },
  });
}
