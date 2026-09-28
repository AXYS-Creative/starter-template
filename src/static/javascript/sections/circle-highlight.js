import { queuePinnedSection } from "../utils/pin-order.js";

// Pinned scroll-scrub: the ring's N slices highlight one at a time, always
// clockwise (increasing index == increasing slice angle, see donutSlicePath
// in .eleventy.js) as the user scrolls through the pin. Captions (and
// circle_highlight.image, if given) stay hidden/shown per the
// circle-highlight--started class this adds right as the pin engages
// (removed on scrolling back out) — see _circle-highlight.scss. The
// sequence always ends on one extra "finale" step past the last slice's
// own dwell — every slice highlighted at once, caption hidden — same
// circle-highlight--finale class driving that in the CSS.
document.querySelectorAll(".circle-highlight").forEach((section) => {
  const pin = section.querySelector(".circle-highlight__pin");
  const slices = Array.from(
    section.querySelectorAll(".circle-highlight__slice"),
  );
  const captions = Array.from(
    section.querySelectorAll(".circle-highlight__caption"),
  );
  const count = slices.length;

  if (!count) return;

  let activeIndex = 0; // matches the loop.first default set server-side in circle-highlight.njk

  function setActive(i) {
    if (i === activeIndex) return;
    activeIndex = i;
    slices.forEach((slice, idx) =>
      slice.classList.toggle("circle-highlight__slice--active", idx === i),
    );
    captions.forEach((caption, idx) =>
      caption.classList.toggle("circle-highlight__caption--active", idx === i),
    );
  }

  const perSliceScroll = 60; // % of pin height spent dwelling on each slice before moving to the next
  const totalSteps = count + 1; // + the finale step past the last slice
  const pinScrollDistance = totalSteps * perSliceScroll;

  function setFinale(isFinale) {
    section.classList.toggle("circle-highlight--finale", isFinale);
  }

  queuePinnedSection(pin, () => {
    ScrollTrigger.create({
      trigger: pin,
      start: "top top",
      end: `+=${pinScrollDistance}%`,
      pin: true,
      scrub: 1,
      onEnter: () => section.classList.add("circle-highlight--started"),
      onLeaveBack: () => section.classList.remove("circle-highlight--started"),
      onUpdate: (self) => {
        const step = Math.min(
          totalSteps - 1,
          Math.floor(self.progress * totalSteps),
        );
        setFinale(step === count);
        if (step < count) setActive(step);
      },
    });
  });
});
