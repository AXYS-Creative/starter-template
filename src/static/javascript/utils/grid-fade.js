// Grid Fade - overlays a grid of tiles on an element and fades them in/out

const TILE_SIZES = {
  sm: { count: 520, minWidth: "3%" },
  md: { count: 192, minWidth: "6%" },
  lg: { count: 40, minWidth: "12%" },
};

// Default scroll ranges. Scrubbed animations are tied to scroll distance, while
// played animations need an end that doesn't reset the tiles mid-scroll
const SCROLL_RANGES = {
  scrub: {
    in: { start: "top 96%", end: "center 75%" },
    "in-out": { start: "top 96%", end: "bottom 4%" },
  },
  play: {
    in: { start: "top 96%", end: "bottom 4%" },
    "in-out": { start: "top 60%", end: "bottom 4%" },
  },
};

const SCRUB_SMOOTHING = 0.5;
const DEFAULT_DURATION = 1.5;

// Return a shuffled copy of an array
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Return tiles sorted by distance from the overlay's center, nearest first.
// Measured from the rendered layout, so it must run once the section has its
// final size
function sortByDistanceFromCenter(tiles, overlay) {
  const centerX = overlay.clientWidth / 2;
  const centerY = overlay.clientHeight / 2;

  const distance = (tile) =>
    Math.hypot(
      tile.offsetLeft + tile.offsetWidth / 2 - centerX,
      tile.offsetTop + tile.offsetHeight / 2 - centerY,
    );

  return tiles
    .map((tile) => ({ tile, distance: distance(tile) }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ tile }) => tile);
}

// Each sequence returns the tiles in the order they should fade
const SEQUENCES = {
  random: (tiles) => shuffle(tiles),
  linear: (tiles) => tiles,
  circular: sortByDistanceFromCenter,
};

function createOverlay(section, { count, minWidth }) {
  const overlay = document.createElement("div");
  overlay.classList.add("grid-fade__overlay");

  const tiles = [];
  for (let i = 0; i < count; i++) {
    const tile = document.createElement("div");
    tile.classList.add("grid-fade__overlay--tile");
    tile.style.minWidth = minWidth;
    overlay.appendChild(tile);
    tiles.push(tile);
  }

  section.appendChild(overlay);
  return { overlay, tiles };
}

const gridFades = document.querySelectorAll(".grid-fade");

gridFades.forEach((section) => {
  const fadeType = section.dataset.gridFadeType === "in-out" ? "in-out" : "in";
  const fadeSize = TILE_SIZES[section.dataset.gridFadeSize] || TILE_SIZES.md;
  const fadeSequence = SEQUENCES[section.dataset.gridFadeSequence]
    ? section.dataset.gridFadeSequence
    : "random";
  const fadeScrub = section.dataset.gridFadeScrub !== "false"; // default true
  const fadeOnce = !fadeScrub && section.dataset.gridFadeOnce === "true"; // only if scrub is false
  const fadeDuration =
    parseFloat(section.dataset.gridFadeDuration) || DEFAULT_DURATION; // only if scrub is false
  const fadeMarkers = section.dataset.gridFadeMarkers === "true";

  const range = SCROLL_RANGES[fadeScrub ? "scrub" : "play"][fadeType];
  const fadeStart = section.dataset.gridFadeStart || range.start;
  const fadeEnd = section.dataset.gridFadeEnd || range.end;

  const { overlay, tiles } = createOverlay(section, fadeSize);

  const scrollTriggerConfig = {
    trigger: section,
    start: fadeStart,
    end: fadeEnd,
    scrub: fadeScrub ? SCRUB_SMOOTHING : false,
    markers: fadeMarkers,
  };

  if (!fadeScrub) {
    scrollTriggerConfig.toggleActions = fadeOnce
      ? "play none none none"
      : "play reset play reset";
    scrollTriggerConfig.once = fadeOnce;
  }

  let tl;

  const build = () => {
    // Rebuilding reverts the old tiles and scroll trigger
    if (tl) tl.scrollTrigger.kill(true);

    // The overlay always renders every tile, but the section clips the ones
    // that overflow it. Only sequence the visible tiles, otherwise the fade
    // finishes early while the clipped tiles use up the rest of the timeline
    const visible = tiles.filter(
      (tile) => tile.offsetTop < overlay.clientHeight,
    );
    const ordered = SEQUENCES[fadeSequence](visible, overlay);
    const fade = { ease: "none", stagger: 1 };

    tl = gsap.timeline({ scrollTrigger: { ...scrollTriggerConfig } });

    if (fadeType === "in") {
      tl.fromTo(ordered, { opacity: 1 }, { opacity: 0, ...fade });
    } else {
      // Fade out, hold (staggered no-op keeps them clear), then fade back in
      tl.to(ordered, { opacity: 0, ...fade })
        .to(ordered, { opacity: 0, ...fade })
        .to(ordered, { opacity: 1, ...fade });
    }

    // Scrubbed timelines are sized by scroll distance, otherwise fit to duration
    if (!fadeScrub) tl.duration(fadeDuration);
  };

  // Which tiles are visible (and their distance from center) depends on the
  // rendered size, which changes as lazy images load or the viewport resizes,
  // so build once the section has a size and rebuild whenever it changes
  let lastSize = "";
  let resizeTimeout;

  new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const size = `${section.clientWidth}x${section.clientHeight}`;
      if (!section.clientHeight || size === lastSize) return;
      lastSize = size;
      build();
    }, 150);
  }).observe(section);
});
