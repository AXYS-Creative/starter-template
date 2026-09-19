import { mqNoMotion } from "../util.js";

// Image Wave — `scrub` prop (see components/image-wave.njk).
// The marquee's idle pan is a CSS animation, which can't take a scroll
// offset and still wrap seamlessly. So for any wave with `data-wave-scrub`,
// take over the track's `translate` here instead: idle pan + scroll offset,
// summed and wrapped by one set width — the same distance the CSS pan
// travels, so the loop stays invisible in both directions.
if (!mqNoMotion) {
  document.querySelectorAll("[data-wave-scrub]").forEach((wave) => {
    const scrub = parseFloat(wave.dataset.waveScrub) || 0;
    const speed = parseFloat(wave.dataset.waveSpeed) || 60; // s per set
    const track = wave.querySelector(".image-wave__track");
    const set = wave.querySelector(".image-wave__set");
    if (scrub <= 0 || !track || !set) return;

    let setWidth = set.getBoundingClientRect().width;
    new ResizeObserver(() => {
      setWidth = set.getBoundingClientRect().width;
    }).observe(set);

    let idle = 0; // px panned by time
    let offset = window.scrollY * scrub; // px pushed by scroll (smoothed)
    let visible = true;

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }).observe(wave);

    wave.classList.add("image-wave--driven"); // turns the CSS pan off

    gsap.ticker.add((_time, deltaTime) => {
      if (!visible || !setWidth) return;

      // Ease toward the scroll target so a jump in scroll doesn't jerk the row.
      const target = window.scrollY * scrub;
      offset += (target - offset) * (1 - Math.exp(-deltaTime / 120));
      idle += (setWidth / speed) * (deltaTime / 1000);

      track.style.translate = `${-gsap.utils.wrap(0, setWidth, idle + offset)}px 0`;
    });
  });
}
