import { root, mqMaxLg } from "../utility.js";

const carouselSnap = document.querySelector(".carousel-snap"),
  trackInner = document.querySelector(".carousel-snap__track-inner"),
  prevBtn = document.querySelector(".carousel-snap-btn-prev"),
  nextBtn = document.querySelector(".carousel-snap-btn-next");

const items = document.querySelectorAll(".carousel-snap__track-item");

let currentIndex = 0;
let startX = 0;
let currentX = 0;
let isDragging = false;
let translateX = 0;

// Media query for conditional flex wrapping. Remove import if not used
// if (mqMaxLg) {
if (carouselSnap) {
  const autoplayClass = "autoplay";
  const autoplayEnabledByAdmin = carouselSnap.classList.contains(autoplayClass);
  const autoplayIntervalTime =
    parseInt(carouselSnap.dataset.autoplayInterval, 10) || 5000;
  let autoplayEnabled = autoplayEnabledByAdmin;
  let autoplayInterval;

  // ✅ Check if visitor preference exists
  const savedAutoplaySetting = localStorage.getItem("carouselAutoplay");
  if (savedAutoplaySetting !== null) {
    autoplayEnabled = savedAutoplaySetting === "true";
  }

  const updateCarousel = () => {
    const trackGap =
      parseFloat(
        getComputedStyle(root).getPropertyValue("--carousel-snap-gap")
      ) || 0;
    const itemWidth = items[0].offsetWidth + trackGap;
    const containerWidth =
      trackInner.parentElement.offsetWidth + trackGap * 1.5;
    const trackWidth = items.length * itemWidth;

    const maxTranslateX = Math.min(0, containerWidth - trackWidth);

    translateX = Math.max(-(currentIndex * itemWidth), maxTranslateX);
    trackInner.style.transition = "transform 0.3s ease-in-out";
    trackInner.style.transform = `translateX(${translateX}px)`;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = translateX === maxTranslateX;
  };

  nextBtn.addEventListener("click", () => {
    if (currentIndex < items.length - 1) {
      currentIndex++;
    } else {
      currentIndex = 0;
    }
    updateCarousel();
    resetAutoplay();
  });

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
    } else {
      currentIndex = items.length - 1;
    }
    updateCarousel();
    resetAutoplay();
  });

  const startDrag = (event) => {
    isDragging = true;
    trackInner.style.transition = "none";
    startX = event.touches ? event.touches[0].clientX : event.clientX;
    stopAutoplay();
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
    resetAutoplay();
  };

  trackInner.addEventListener("mousedown", startDrag);
  trackInner.addEventListener("mousemove", onDrag);
  trackInner.addEventListener("mouseup", endDrag);
  trackInner.addEventListener("mouseleave", endDrag);

  trackInner.addEventListener("touchstart", startDrag);
  trackInner.addEventListener("touchmove", onDrag);
  trackInner.addEventListener("touchend", endDrag);

  // ✅ Autoplay Logic
  const startAutoplay = () => {
    if (!autoplayEnabled) return;
    stopAutoplay();
    autoplayInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % items.length;
      updateCarousel();
    }, autoplayIntervalTime);
  };

  const stopAutoplay = () => {
    clearInterval(autoplayInterval);
  };

  const resetAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  // ✅ Accessible Toggle Button Logic
  // This logic could be thrown in a buttons.js file? Reuse across different button--toggle components
  const autoplayToggle = document.querySelector(
      ".carousel-snap-autoplay-toggle"
    ),
    autoplayToggleLabel = document.querySelector(
      ".carousel-snap-autoplay-toggle__label"
    ).innerHTML,
    autoplayToggleLabelTrue = document
      .querySelector(".carousel-snap-autoplay-toggle__switch")
      .getAttribute("data-label-true"),
    autoplayToggleLabelFalse = document
      .querySelector(".carousel-snap-autoplay-toggle__switch")
      .getAttribute("data-label-false");

  // This logic could be thrown in a buttons.js file? Reuse across different button--toggle components
  if (autoplayToggle) {
    autoplayToggle.setAttribute("aria-pressed", autoplayEnabled.toString());

    autoplayToggle.addEventListener("click", () => {
      autoplayEnabled = !autoplayEnabled;
      localStorage.setItem("carouselAutoplay", autoplayEnabled); // Save preference
      autoplayToggle.setAttribute("aria-pressed", autoplayEnabled.toString());
      autoplayToggle.setAttribute(
        "aria-label",
        `${autoplayToggleLabel}${
          autoplayEnabled ? autoplayToggleLabelTrue : autoplayToggleLabelFalse
        }`
      );
      resetAutoplay();
    });
  }

  updateCarousel();
  startAutoplay();
}
// }
