// Requires external stylesheet (see app.njk)
import { root } from "../util.js";

// Select ALL carousel instances
const carouselSwipers = document.querySelectorAll(".carousel-swiper");

if (carouselSwipers.length) {
  carouselSwipers.forEach((carousel) => {
    const autoplayEnabled = carousel.dataset.autoplayEnabled === "true";
    const autoplayInterval = Number(carousel.dataset.autoplayInterval) || 0;
    const paginationType = carousel.dataset.paginationType || "bullets";
    const paginationClickable = carousel.dataset.paginationClickable === "true";

    const carouselHeight = carousel.offsetHeight;
    root.style.setProperty("--carousel-swiper-height", `${carouselHeight}px`);

    const swiper = new Swiper(carousel, {
      autoplay:
        autoplayEnabled && autoplayInterval > 0
          ? {
              delay: autoplayInterval,
              disableOnInteraction: false,
            }
          : false,

      slidesPerView: "auto",
      spaceBetween: 16,
      loop: true,
      speed: 500,

      mousewheel: {
        enabled: true,
        sensitivity: 1,
        releaseOnEdges: false,
        forceToAxis: true,
        thresholdDelta: 10,
        thresholdTime: 500,
      },

      keyboard: true,
      simulateTouch: true,
      cssMode: false,

      freeMode: {
        enabled: true,
        sticky: true,
        momentum: true,
        momentumRatio: 0.5,
        momentumVelocityRatio: 0.5,
      },

      breakpoints: {
        1024: {
          slidesPerView: 3,
        },
      },

      navigation: {
        nextEl: carousel.querySelector(".swiper-button-next"),
        prevEl: carousel.querySelector(".swiper-button-prev"),
      },

      pagination: {
        el: carousel.querySelector(".swiper-pagination"),
        type: paginationType,
        clickable: paginationClickable,
      },

      on: {
        touchEnd() {
          resetAutoplay(this, autoplayEnabled);
        },

        keyPress() {
          resetAutoplay(this, autoplayEnabled);
        },
      },
    });

    carousel.addEventListener("wheel", () => resetAutoplay(swiper, autoplayEnabled), {
      passive: true,
    });

    const nextBtn = carousel.querySelector(".swiper-button-next");
    const prevBtn = carousel.querySelector(".swiper-button-prev");

    if (nextBtn) {
      nextBtn.addEventListener("click", () => resetAutoplay(swiper, autoplayEnabled));
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => resetAutoplay(swiper, autoplayEnabled));
    }

    const paginationEl = carousel.querySelector(".swiper-pagination");
    if (paginationEl) {
      paginationEl.addEventListener("click", () => resetAutoplay(swiper, autoplayEnabled));
    }

    carousel.addEventListener("keydown", () => resetAutoplay(swiper, autoplayEnabled));
  });
}

function resetAutoplay(swiperInstance, isEnabled) {
  if (!isEnabled) return;
  if (!swiperInstance?.autoplay) return;

  swiperInstance.autoplay.stop();
  swiperInstance.autoplay.start();
}
