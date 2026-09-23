// Multiple pinned ScrollTrigger sections (scroll-horizontal, gallery-horizontal,
// tunnel's centered variant, etc.) each bake in a scroll position relative to
// the page layout AT THE MOMENT their `pin: true` ScrollTrigger is created —
// gsap.to({ scrollTrigger: { pin: true } }) inserts a pin-spacer immediately,
// synchronously. A later-in-DOM section's pin (or any OTHER ScrollTrigger —
// .gsap-animate, tunnel's non-pinned tweens, etc.) only accounts for an
// earlier-in-DOM pinned section's full pin duration if that pin was already
// created (spacer already inserted) at the time.
//
// Since each section/utility sets up its triggers in its own file, actual
// creation order ends up matching *import order in index.js*, not DOM order
// on a given page. Get it backwards and the later trigger's position is
// stale by roughly the earlier section's pin duration; ScrollTrigger.refresh()
// (even a hard one) does not retroactively fix a trigger that was created
// out of order.
//
// Fix: don't create a `pin: true` ScrollTrigger directly in a section file —
// call queuePinnedSection(pinEl, setup) instead. Any OTHER ScrollTrigger
// whose position could be affected by a pin above it on the page (e.g. a
// plain .gsap-animate reveal, or tunnel's non-centered tweens) should call
// afterPinnedSections(setup) instead of running immediately.
//
// Both queues flush together in a single microtask, once, after every
// module's top-level/matchMedia-immediate code has run (regardless of which
// file registered what, or in what order — this does NOT rely on import
// order between files, only that registration happens synchronously at
// module-eval time, which every current caller does). All queued pins are
// created first, sorted into actual DOM order; only once that's done do the
// "after" callbacks run, so they always see the final, pin-inclusive layout.
const pinQueue = [];
const afterQueue = [];
let scheduled = false;

function scheduleFlush() {
  if (scheduled) return;
  scheduled = true;

  queueMicrotask(() => {
    pinQueue
      .splice(0)
      .sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      )
      .forEach(({ setup }) => setup());

    afterQueue.splice(0).forEach((setup) => setup());

    scheduled = false;
  });
}

export function queuePinnedSection(el, setup) {
  pinQueue.push({ el, setup });
  scheduleFlush();
}

export function afterPinnedSections(setup) {
  afterQueue.push(setup);
  scheduleFlush();
}
