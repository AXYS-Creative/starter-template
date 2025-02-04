import { mqMouse, isSafari } from "../utility.js";
import { cubicBezier } from "../global/animations.js";

const cursor = document.querySelector(".mouse-cursor");
const hideMouse = document.querySelectorAll(".hide-mouse");

if (mqMouse.matches) {
  let mouseX = 0,
    mouseY = 0,
    cursorX = 0,
    cursorY = 0,
    startX = 0,
    startY = 0,
    progress = 0;

  const easeFunction = cubicBezier(0.29, 1.01, 0.16, 1.09);

  const duration = isSafari() ? 0.05 : 0.065; // Edit duration here

  const animateCursor = () => {
    if (progress < 1) {
      progress = Math.min(progress + duration, 1);

      const easeFactor = easeFunction(progress);

      cursorX = startX + (mouseX - startX) * easeFactor;
      cursorY = startY + (mouseY - startY) * easeFactor;

      cursor.style.translate = `calc(${cursorX}px - 50%) calc(${cursorY}px - 50%)`;
    }

    requestAnimationFrame(animateCursor);
  };

  animateCursor();

  document.addEventListener("mousemove", (e) => {
    cursor.style.opacity = 1;

    startX = cursorX;
    startY = cursorY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    progress = 0;
  });

  // Mouse hover effects
  hideMouse.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cursor.classList.add("hidden");
    });
    el.addEventListener("mouseleave", () => {
      cursor.classList.remove("hidden");
    });
  });
}
