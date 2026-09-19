import { mqNoMotion } from "../util.js";

// Hero Image Circle — `images_scrub` prop (see sections/hero-image-circle.njk).
// Each `.hero-image-circle__spin` wrapper carries its scrub strength in
// `data-images-scrub` (1 ≈ 90deg across the section's full pass through the
// viewport) and its spin direction in `data-images-scrub-dir` (-1 / 1).
// Rotation is centred on 0 so the circle sits at its natural orientation
// when the section is mid-screen.
if (!mqNoMotion) {
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll("[data-images-scrub]").forEach((el) => {
    const strength = parseFloat(el.dataset.imagesScrub) || 0;
    if (strength <= 0) return;

    const dir = parseFloat(el.dataset.imagesScrubDir) || 1;
    const half = strength * 45 * dir;

    gsap.fromTo(
      el,
      { rotation: -half },
      {
        rotation: half,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest(".hero-image-circle"),
          start: "-50% bottom",
          end: "150% top",
          scrub: true,
        },
      },
    );
  });
}
