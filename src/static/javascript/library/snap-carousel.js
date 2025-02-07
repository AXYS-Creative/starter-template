import { root, mqMaxLg } from "../utility.js";

const trackInner = document.querySelector(".snap-carousel__track-inner");
const items = document.querySelectorAll(".snap-carousel__track-item");
const prevBtn = document.getElementById("snap-carousel-btn-prev");
const nextBtn = document.getElementById("snap-carousel-btn-next");

let currentIndex = 0;
let startX = 0;
let currentX = 0;
let isDragging = false;
let translateX = 0;

// Media query for conditional wrapping. Remove import if not used
// if (mqMaxLg) {
const updateCarousel = () => {
  const trackGap =
    parseFloat(
      getComputedStyle(root).getPropertyValue("--snap-carousel-gap")
    ) || 0;
  const itemWidth = items[0].offsetWidth + trackGap;
  const containerWidth = trackInner.parentElement.offsetWidth + trackGap;
  const trackWidth = items.length * itemWidth;

  // Ensure last slide aligns with the right edge
  const maxTranslateX = Math.min(0, containerWidth - trackWidth);

  translateX = Math.max(-(currentIndex * itemWidth), maxTranslateX);
  trackInner.style.transition = "transform 0.3s ease-in-out";
  trackInner.style.transform = `translateX(${translateX}px)`;

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = translateX === maxTranslateX; // Disable if at the end
};

nextBtn.addEventListener("click", () => {
  if (currentIndex < items.length - 1) {
    currentIndex++;
    updateCarousel();
  }
});

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    updateCarousel();
  }
});

const startDrag = (event) => {
  isDragging = true;
  trackInner.style.transition = "none";
  startX = event.touches ? event.touches[0].clientX : event.clientX;
};

const onDrag = (event) => {
  if (!isDragging) return;
  currentX = event.touches ? event.touches[0].clientX : event.clientX;
  let movement = currentX - startX;
  trackInner.style.transform = `translateX(${translateX + movement}px)`;
};

const endDrag = () => {
  if (!isDragging) return;
  isDragging = false;

  let movement = currentX - startX;
  const threshold = items[0].offsetWidth * 0.3;

  if (movement > threshold && currentIndex > 0) {
    currentIndex--;
  } else if (movement < -threshold && currentIndex < items.length - 1) {
    currentIndex++;
  }

  updateCarousel();
};

trackInner.addEventListener("mousedown", startDrag);
trackInner.addEventListener("mousemove", onDrag);
trackInner.addEventListener("mouseup", endDrag);
trackInner.addEventListener("mouseleave", endDrag);

trackInner.addEventListener("touchstart", startDrag);
trackInner.addEventListener("touchmove", onDrag);
trackInner.addEventListener("touchend", endDrag);

updateCarousel();
// }
