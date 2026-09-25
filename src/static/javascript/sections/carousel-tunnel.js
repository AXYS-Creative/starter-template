import { queuePinnedSection } from "../utils/pin-order.js";

// Scroll-driven "zoom out of a full-viewport image into a peek carousel".
//
// __scaler gets the scroll-scrub `scale` (zoomed in at the start, 1 at rest)
// and __track (a separate element, one level in) gets `translateX` for
// carousel navigation/autoplay. Keeping them on separate elements means the
// two transforms never have to be composed by hand — GSAP tracks each
// property independently, and since __scaler's own box always spans the
// full pin (100% width/height) with `transform-origin: center center`, its
// origin point is always the exact viewport center regardless of which
// slide is active, so the active slide never drifts as the zoom animates.
//
// Looping: clone enough slides onto each end of the track to cover half the
// viewport (standard infinite-carousel technique, sized dynamically instead
// of a fixed 1 clone per side — a narrower --slide-width means more slides
// peek at once, so a single clone would leave a visible gap at the loop
// boundary). Silently snaps back once a clone finishes sliding into view.
// `index` starts at `cloneCount` (== real slide 0).
document.querySelectorAll(".carousel-tunnel").forEach((section) => {
  const pin = section.querySelector(".carousel-tunnel__pin");
  const viewport = section.querySelector(".carousel-tunnel__viewport");
  const scaler = section.querySelector(".carousel-tunnel__scaler");
  const track = section.querySelector(".carousel-tunnel__track");
  const content = section.querySelector(".carousel-tunnel__content");
  const pagination = section.querySelector(".carousel-tunnel__pagination");
  const realSlides = Array.from(track.children);

  if (!realSlides.length) return;

  const slideCount = realSlides.length;
  const canLoop = slideCount > 1;
  const interval = parseInt(track.dataset.carouselTunnelInterval, 10) || 0;
  const dragThreshold =
    parseFloat(track.dataset.carouselTunnelDragThreshold) || 0.1;

  let cloneCount = 0;

  if (canLoop) {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = realSlides[0].offsetWidth + gap;
    const perSide = Math.ceil(viewport.offsetWidth / 2 / step) + 1;
    cloneCount = Math.min(Math.max(perSide, 1), slideCount);

    const tailClones = realSlides
      .slice(-cloneCount)
      .map((slide) => slide.cloneNode(true));
    const headClones = realSlides
      .slice(0, cloneCount)
      .map((slide) => slide.cloneNode(true));
    [...tailClones, ...headClones].forEach((clone) =>
      clone.setAttribute("aria-hidden", "true"),
    );
    track.prepend(...tailClones);
    track.append(...headClones);
  }

  const allSlides = Array.from(track.children);
  // Queried after cloning (above), not before — querySelectorAll is a
  // static snapshot at call time, so querying earlier would miss every
  // cloned slide's caption, leaving it permanently un-revealed.
  const panelCaptions = section.querySelectorAll(
    ".carousel-tunnel__slide-caption",
  );
  const dots = Array.from(
    pagination?.querySelectorAll(".carousel-tunnel__dot") || [],
  );
  const prevBtn = pagination?.querySelector(".carousel-tunnel__arrow--prev");
  const nextBtn = pagination?.querySelector(".carousel-tunnel__arrow--next");

  let index = canLoop ? cloneCount : 0;
  let autoplayTimer = null;
  let isAnimating = false;
  // Flipped by the scrub's onUpdate below once the zoom finishes — read here
  // too so a drag can't start autoplay early (e.g. mid-zoom, before copy/
  // captions/pagination have revealed).
  let revealed = false;

  // Real (unscaled) layout metrics — offsetWidth ignores __scaler's
  // transform entirely, which is what we want: `x` positions the track in
  // the same pre-scale coordinate space the scale's transform-origin uses.
  function trackStep() {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return allSlides[0].offsetWidth + gap;
  }

  function updateDots(realIndex) {
    dots.forEach((dot, i) =>
      dot.classList.toggle("carousel-tunnel__dot--active", i === realIndex),
    );
  }

  function goTo(i, animate = true) {
    // Drop overlapping navigation requests rather than letting a new tween
    // overwrite one still in flight — GSAP kills an overwritten tween
    // without running its onComplete, which would skip the clone-wrap
    // check below and let `index` grow past the real slide range (this is
    // what a throttled background tab's setInterval "catch-up" burst on
    // autoplay would otherwise trigger).
    if (animate && isAnimating) return;

    const step = trackStep();
    const slideWidth = allSlides[0].offsetWidth;
    const x = viewport.offsetWidth / 2 - (i * step + slideWidth / 2);

    if (animate) isAnimating = true;

    gsap.to(track, {
      x,
      duration: animate ? 0.7 : 0,
      ease: "power2.inOut",
      onComplete: () => {
        isAnimating = false;
        if (!canLoop) return;
        // Landed on a clone — snap back to its real counterpart with no
        // transition so the loop feels seamless.
        if (i >= cloneCount + slideCount) {
          index = i - slideCount;
          goTo(index, false);
        } else if (i < cloneCount) {
          index = i + slideCount;
          goTo(index, false);
        }
      },
    });

    index = i;
    updateDots((((i - cloneCount) % slideCount) + slideCount) % slideCount);
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  function startAutoplay() {
    if (!canLoop || autoplayTimer || interval <= 0) return;
    autoplayTimer = setInterval(next, interval);
  }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function resetAutoplay() {
    stopAutoplay();
    if (revealed) startAutoplay();
  }

  nextBtn?.addEventListener("click", () => {
    next();
    resetAutoplay();
  });

  prevBtn?.addEventListener("click", () => {
    prev();
    resetAutoplay();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      goTo(canLoop ? i + cloneCount : i);
      resetAutoplay();
    });
  });

  // Drag-to-navigate — 1:1 follow while dragging (a plain gsap.set, no
  // easing/duration, so it never fights the eventual release tween or the
  // isAnimating guard), then goTo() on release resolves however many
  // slides the drag crossed and animates the rest of the way from wherever
  // the pointer let go.
  let dragStartX = 0;
  let dragStartTrackX = 0;
  let dragging = false;

  track.style.touchAction = "pan-y"; // only claim the horizontal gesture — vertical touch scroll still reaches the page

  track.addEventListener("pointerdown", (e) => {
    // Not live yet (still mid-zoom, before copy/captions/pagination reveal
    // and autoplay starts) — the carousel is effectively paused, so dragging
    // shouldn't be able to change slides either.
    if (!revealed) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartTrackX = gsap.getProperty(track, "x");
    gsap.killTweensOf(track);
    isAnimating = false;
    track.setPointerCapture(e.pointerId);
    track.classList.add("carousel-tunnel__track--dragging");
    stopAutoplay();
  });

  track.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    gsap.set(track, { x: dragStartTrackX + (e.clientX - dragStartX) });
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("carousel-tunnel__track--dragging");

    const step = trackStep();
    const maxJump = canLoop ? cloneCount : 0;
    const dragged = -(e.clientX - dragStartX); // positive == dragged toward "next"

    // Crossing dragThreshold's fraction of one slide advances it, crossing
    // 1 + dragThreshold advances two, and so on — a plain Math.round(x/step)
    // would hardcode a 50% threshold instead of the configurable one.
    const slidesCrossed = Math.floor(
      Math.abs(dragged) / step + (1 - dragThreshold),
    );
    const deltaIndex = Math.max(
      -maxJump,
      Math.min(maxJump, Math.sign(dragged) * slidesCrossed),
    );

    goTo(index + deltaIndex);
    resetAutoplay();
  }

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  window.addEventListener("resize", () => goTo(index, false));

  // Guarantee the active slide fully covers the viewport at scroll start,
  // whatever --slide-width/--slide-aspect end up being — a fixed scale
  // constant would need re-tuning every time those change. Measured against
  // `pin` (always the full 100vw/100vh pinned frame), not `viewport` — since
  // __viewport dropped its own `position: absolute; inset: 0;` in favor of
  // flex layout, its height now just matches its content (the slide) rather
  // than the full frame, which would make this a no-op.
  function computeStartScale() {
    const slideWidth = allSlides[0].offsetWidth;
    const slideHeight = allSlides[0].offsetHeight;
    const scaleX = pin.offsetWidth / slideWidth;
    const scaleY = pin.offsetHeight / slideHeight;
    return Math.max(scaleX, scaleY, 1);
  }

  const revealTargets = [content, pagination, ...panelCaptions].filter(Boolean);

  goTo(index, false);
  gsap.set(scaler, { scale: computeStartScale() });
  // Hidden/offset starting state lives in CSS (hide-content + the initial
  // `translate`) — the fade+rise itself is a played CSS transition, not a
  // scrubbed one, toggled by the `is-visible` class below.

  const sectionStyles = getComputedStyle(section);
  const scaleDuration =
    parseFloat(sectionStyles.getPropertyValue("--scale-duration")) || 0.6;
  const pinScrollDistance = 125; // % — how far past the pin's own height the scrub runs; keep in sync with `end` below

  // Deferred — this pinned section's own position (and the "top top" start
  // below) depends on any pinned section above it on the page already
  // having its spacer inserted. See utils/pin-order.js.
  queuePinnedSection(pin, () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: "top top",
        end: `+=${pinScrollDistance}%`,
        pin: true,
        scrub: 1,
        // Toggled off `self.progress` (this same pinned trigger's own 0–1
        // scrub position) rather than a second ScrollTrigger on `pin` — a
        // separate trigger's start/end strings get computed against
        // `pin`'s *pinned* geometry too, which is fragile to fight with a
        // relative "+=X%" offset. Checking progress here is exact and
        // avoids that entirely. Copy, captions and pagination should only
        // reveal once the scale tween itself is done (scaleDuration), and
        // autoplay starts at that same moment — not once the pin fully
        // releases, and not on some earlier, independent fraction. The
        // reveal itself is still a played (not scrubbed) CSS transition —
        // this only flips the `is-visible` class once each way, and
        // starts/stops autoplay, rather than running on every scroll tick.
        onUpdate: (self) => {
          const shouldReveal = self.progress >= scaleDuration;
          if (shouldReveal === revealed) return;
          revealed = shouldReveal;
          section.classList.toggle("carousel-tunnel--active", shouldReveal);
          if (revealTargets.length) {
            revealTargets.forEach((el) =>
              el.classList.toggle("is-visible", shouldReveal),
            );
          }
          if (shouldReveal) startAutoplay();
          else stopAutoplay();
        },
      },
    });

    // "power2.out" so the zoom eases into its resting scale instead of
    // stopping dead the instant the scrub reaches scaleDuration.
    tl.to(scaler, { scale: 1, ease: "power2.out", duration: scaleDuration }, 0);

    // Scrub maps the *entire* scroll-trigger range onto the timeline's full
    // duration, whatever that is — without this padding, the timeline's
    // duration would just be wherever the scale tween above ends
    // (scaleDuration), collapsing the dwell time it's meant to leave.
    tl.set({}, {}, 1);
  });
});
