import { mqMouse, isSafari } from "../utility.js";
import { cubicBezier } from "../global/animations.js";

const cursor = document.querySelector(".mouse-cursor");
const hideMouse = document.querySelectorAll(".hide-mouse");

if (cursor && mqMouse.matches) {
  let followMouse = true;

  let mouseX = 0,
    mouseY = 0,
    cursorX = 0,
    cursorY = 0,
    startX = 0,
    startY = 0,
    progress = 0;

  const easeFunction = cubicBezier(0.29, 1.01, 0.16, 1.09);

  const duration = isSafari() ? 0.07 : 0.04; // Edit duration here

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
    if (!followMouse) return;

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

  // Mouse to selector sibling
  const siblingHover = (
    triggerSelector, // selector string for hover trigger
    siblingSelector, // selector string for inner target (relative to trigger)
    activeClass = "", // class to apply to cursor
    eventType = "mousemove" // default to mousemove, can be mouseenter
  ) => {
    const triggers = document.querySelectorAll(triggerSelector);

    triggers.forEach((el) => {
      el.addEventListener(eventType, () => {
        followMouse = false;

        const sibling = el.querySelector(siblingSelector);
        if (!sibling || !cursor) return;

        const rect = sibling.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        cursor.style.translate = `${centerX - cursor.offsetWidth / 2}px ${
          centerY - cursor.offsetHeight / 2
        }px`;

        if (activeClass) {
          cursor.classList.add(activeClass);
        }
      });

      el.addEventListener("mouseleave", () => {
        followMouse = true;
        if (activeClass) {
          cursor.classList.remove(activeClass);
        }
      });
    });
  };

  // prettier-ignore
  siblingHover(".sibling-hover", ".sibling-hover__target", "test-class");
}
