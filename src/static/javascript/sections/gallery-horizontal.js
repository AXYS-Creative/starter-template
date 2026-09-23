import { queuePinnedSection } from "../utils/pin-order.js";

let responsiveGsap = gsap.matchMedia();

// Horizontal pin-scroll only runs at `lg` and up — below that the section is
// a normal scroll-reveal column (see _gallery-horizontal.scss), so there's
// nothing here to pin or translate.
responsiveGsap.add(
  {
    minLg: "(min-width: 1025px)",
  },
  () => {
    const galleryHorizontal = document.querySelectorAll(".gallery-horizontal");

    galleryHorizontal.forEach((el) => {
      let container = el.querySelector(".gallery-horizontal__container");
      let pin = el.querySelector(".gallery-horizontal__pin");
      let slider = el.querySelector(".gallery-horizontal__slider");

      const sliderWidth = slider.scrollWidth;
      const containerWidth = container.offsetWidth;
      const distanceToTranslate = sliderWidth - containerWidth;

      // Nothing to scroll (e.g. a single group fits within the viewport).
      if (distanceToTranslate <= 0) return;

      // Pin duration is tied to the actual horizontal distance, not a flat
      // guess — see scroll-horizontal.js for why that matters.
      const duration = "+=" + distanceToTranslate;

      // Create in actual DOM order relative to any other pinned section on
      // the page — see utils/pin-order.js for why that matters.
      queuePinnedSection(pin, () => {
        // Actual Pinning (title above stays in normal flow — only `__pin` locks)
        gsap.to(pin, {
          scrollTrigger: {
            trigger: pin,
            start: "center center",
            end: duration,
            pin: true,
          },
        });

        // Slider Along X-Axis
        gsap.fromTo(
          slider,
          { x: 0 },
          {
            x: () => -distanceToTranslate,
            ease: "none",
            scrollTrigger: {
              trigger: pin,
              start: "center center",
              end: duration,
              scrub: 0.5,
            },
          }
        );
      });
    });
  }
);
