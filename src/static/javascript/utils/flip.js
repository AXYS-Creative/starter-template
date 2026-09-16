// Toggles the `.active` class used by the `.flip` CSS utility
// (see _util.scss) which drives `perspective(500px) rotateX(-5deg) -> 0deg`
// via a plain CSS transition. Kept as a bare ScrollTrigger class-toggle
// (same shape as the `.gsap-animate` util in gsap.js) since the flip itself
// is CSS-driven, not a GSAP tween — unless `flipScrub` is set, which needs
// a GSAP tween to tie the rotation to scroll position instead.

document.querySelectorAll(".flip").forEach((el) => {
  const flipFrom = el.dataset.flipFrom || "top"; // "top" | "center" | "bottom"
  const flipTrigger = el.dataset.flipTrigger || el;
  const flipStart = el.dataset.flipStart || "top 98%";
  const flipEnd = el.dataset.flipEnd || "bottom top";
  const flipMarkers = el.dataset.flipMarkers === "true";
  const flipScrub = el.dataset.flipScrub === "true"; // default false
  const flipOnce = !flipScrub && el.dataset.flipOnce === "true"; // only if scrub is false
  // Applies even while scrubbing — GSAP maps scroll progress through the
  // tween's ease curve, so e.g. "elastic.out(1.5, 0.3)" or "back.out(2)"
  // scrubs the same overshoot/swing that flip-swing plays on enter, just
  // driven by scroll position instead of time.
  const flipEase = el.dataset.flipEase || "none";

  el.style.transformOrigin = flipFrom;

  if (flipScrub) {
    // CSS transition would fight the per-frame scrub updates, so disable it
    el.style.transition = "none";

    gsap.fromTo(
      el,
      { rotateX: -60, transformPerspective: 500 },
      {
        rotateX: 0,
        ease: flipEase,
        scrollTrigger: {
          trigger: flipTrigger,
          start: flipStart,
          end: flipEnd,
          scrub: true,
          markers: flipMarkers,
        },
      },
    );
  } else if (flipOnce) {
    ScrollTrigger.create({
      trigger: flipTrigger,
      start: flipStart,
      end: flipEnd,
      once: true,
      onEnter: () => el.classList.add("active"),
      markers: flipMarkers,
    });
  } else {
    ScrollTrigger.create({
      trigger: flipTrigger,
      start: flipStart,
      end: flipEnd,
      onEnter: () => el.classList.add("active"),
      onLeave: () => el.classList.remove("active"),
      onEnterBack: () => el.classList.add("active"),
      onLeaveBack: () => el.classList.remove("active"),
      markers: flipMarkers,
    });
  }
});
