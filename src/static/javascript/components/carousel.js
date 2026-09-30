import { mqNoMotion, root } from "../util.js";

const DRAG_THRESHOLD = 5;
const SETTLE_MS = 120;

document.querySelectorAll(".carousel").forEach((carousel) => {
  const track = carousel.querySelector(".carousel__track");
  const realSlides = [...carousel.querySelectorAll(".carousel__slide")];
  const count = realSlides.length;
  const prevBtn = carousel.querySelector(".carousel__prev");
  const nextBtn = carousel.querySelector(".carousel__next");
  const dotsEl = carousel.querySelector(".carousel__dots");
  const loop = carousel.dataset.loop === "true" && count > 1;
  const autoplayOn = carousel.dataset.autoplayEnabled === "true" && !mqNoMotion;
  const interval = Number(carousel.dataset.autoplayInterval) || 4000;

  let dots = [];
  let timer = null;
  let paused = false;
  let settleTimer = null;
  let lastWidth = 0;

  if (loop) {
    const clones = () =>
      realSlides.map((slide) => {
        const clone = slide.cloneNode(true);
        clone.classList.add("carousel__slide--clone");
        clone.setAttribute("aria-hidden", "true");
        clone.inert = true;
        return clone;
      });
    track.prepend(...clones());
    track.append(...clones());
  }

  const slides = [...track.children];
  const step = () =>
    slides.length > 1
      ? slides[1].getBoundingClientRect().left -
        slides[0].getBoundingClientRect().left
      : 1;
  const maxScroll = () => track.scrollWidth - track.clientWidth;
  const rawIndex = () => Math.round(track.scrollLeft / step());
  const pageCount = () =>
    loop ? count : maxScroll() > 1 ? Math.round(maxScroll() / step()) + 1 : 1;
  const currentPage = () => {
    const raw = rawIndex();
    return loop
      ? (((raw - count) % count) + count) % count
      : Math.min(pageCount() - 1, Math.max(0, raw));
  };

  const goToRaw = (raw) => {
    const max = Math.round(maxScroll() / step());
    track.scrollTo({
      left: Math.min(max, Math.max(0, raw)) * step(),
      behavior: mqNoMotion ? "auto" : "smooth",
    });
  };
  const goToPage = (page) => {
    if (!loop) return goToRaw(page);
    normalize();
    const raw = rawIndex();
    goToRaw(page + count * Math.round((raw - page) / count));
  };
  const move = (delta) => {
    if (loop) normalize();
    const page = currentPage();
    if (loop) return goToRaw(rawIndex() + delta);
    goToRaw(page + delta);
  };

  // Keeps the viewport inside the middle set of slides, which looks identical.
  const normalize = () => {
    if (!loop) return;
    const setWidth = count * step();
    const pos = track.scrollLeft;
    if (pos < setWidth) track.scrollLeft = pos + setWidth;
    else if (pos >= setWidth * 2) track.scrollLeft = pos - setWidth;
  };

  const buildDots = () => {
    if (!dotsEl) return;
    const total = pageCount();
    if (dots.length === total) return;
    dotsEl.replaceChildren();
    dots = Array.from({ length: total }, (_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot tab-element-page";
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      dot.addEventListener("click", () => {
        goToPage(i);
        restartAutoplay();
      });
      dotsEl.append(dot);
      return dot;
    });
    dotsEl.hidden = total < 2;
  };

  const progress = () => {
    if (loop) {
      const setWidth = count * step();
      return ((((track.scrollLeft - setWidth) / setWidth) % 1) + 1) % 1;
    }
    return maxScroll() > 1 ? track.scrollLeft / maxScroll() : 0;
  };

  const update = () => {
    buildDots();
    const page = currentPage();
    dots.forEach((dot, i) =>
      i === page
        ? dot.setAttribute("aria-current", "true")
        : dot.removeAttribute("aria-current"),
    );
    if (prevBtn) prevBtn.disabled = !loop && page === 0;
    if (nextBtn) nextBtn.disabled = !loop && page >= pageCount() - 1;
    carousel.style.setProperty(
      "--carousel-progress",
      Math.min(1, Math.max(0, progress())).toFixed(4),
    );
  };

  const advance = () => {
    if (loop) return move(1);
    const page = currentPage();
    goToRaw(page >= pageCount() - 1 ? 0 : page + 1);
  };

  const stopAutoplay = () => {
    clearInterval(timer);
    timer = null;
  };
  const startAutoplay = () => {
    if (!autoplayOn || paused || timer) return;
    timer = setInterval(advance, interval);
  };
  const restartAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  prevBtn?.addEventListener("click", () => {
    move(-1);
    restartAutoplay();
  });
  nextBtn?.addEventListener("click", () => {
    move(1);
    restartAutoplay();
  });

  track.addEventListener(
    "scroll",
    () => {
      update();
      if (!loop) return;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (!dragging) normalize();
      }, SETTLE_MS);
    },
    { passive: true },
  );
  track.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    move(e.key === "ArrowRight" ? 1 : -1);
    restartAutoplay();
  });
  new ResizeObserver(() => {
    if (loop && track.clientWidth !== lastWidth) {
      const page = lastWidth ? currentPage() : 0;
      track.scrollLeft = (count + page) * step();
    }
    lastWidth = track.clientWidth;
    update();
  }).observe(track);

  // Mouse drag; touch and trackpad scroll natively.
  let startX = 0;
  let startScroll = 0;
  let dragging = false;
  let moved = false;

  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    moved = true;
    track.classList.add("is-dragging");
    track.scrollLeft = startScroll - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    if (moved) goToRaw(rawIndex());
    restartAutoplay();
  });
  track.addEventListener(
    "click",
    (e) => {
      if (moved) e.stopPropagation();
      moved = false;
    },
    true,
  );

  if (autoplayOn) {
    const pause = () => {
      paused = true;
      stopAutoplay();
    };
    const resume = () => {
      paused = false;
      startAutoplay();
    };
    carousel.addEventListener("mouseenter", pause);
    carousel.addEventListener("mouseleave", resume);
    carousel.addEventListener("focusin", pause);
    carousel.addEventListener("focusout", resume);
    document.addEventListener("visibilitychange", () =>
      document.hidden ? pause() : resume(),
    );
    startAutoplay();
  }

  if (loop) {
    lastWidth = track.clientWidth;
    track.scrollLeft = count * step();
  }
  update();
  root.style.setProperty("--carousel-height", `${carousel.offsetHeight}px`);
});
