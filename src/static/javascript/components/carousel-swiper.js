// Requires external stylesheet (see app.njk)
import { root } from "../util.js";
const carouselSwiper = document.querySelector(".carousel-swiper");

if (carouselSwiper) {
  const autoplayEnabled = carouselSwiper.dataset.autoplayEnabled === "true";
  const autoplayInterval = carouselSwiper.dataset.autoplayInterval;
  const paginationType = carouselSwiper.dataset.pagination;

  let carouselHeight = carouselSwiper.offsetHeight;
  root.style.setProperty("--carousel-swiper-height", `${carouselHeight}px`);

  let swiper = new Swiper(".mySwiper", {
    autoplay: autoplayEnabled
      ? {
          delay: autoplayInterval,
          disableOnInteraction: false,
        }
      : false,
    slidesPerView: "auto",
    spaceBetween: 16,
    loop: false,
    mousewheel: true,
    keyboard: true,
    simulateTouch: true, // Allow drag (cssMode needs to be false)
    cssMode: false,
    breakpoints: {
      1024: {
        slidesPerView: 3,
      },
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    pagination: {
      el: ".swiper-pagination",
      type: paginationType,
    },
  });
}
