import { mqMouse, isSafari } from "../util.js";
import { cubicBezier } from "../global/animations.js";

const cursor = document.querySelector(".mouse-cursor, .mouse-cursor--elastic");
const hideMouse = document.querySelectorAll(".hide-mouse");

if (cursor && mqMouse.matches) {
  const isElastic = cursor.dataset.elastic === "true";
  const shape = cursor.querySelector(".mouse-cursor__shape");

  let followMouse = true;

  let mouseX = 0,
    mouseY = 0,
    cursorX = 0,
    cursorY = 0,
    startX = 0,
    startY = 0,
    progress = 0;

  const easeFunction = cubicBezier(0.29, 1.01, 0.16, 1.09);
  const duration = isSafari() ? 0.032 : 0.036;

  const previousMouse = { x: 0, y: 0 };
  let currentScale = 0;
  let currentAngle = 0;
  const velocityScale = 0.5;
  const velocityClamp = 150;
  const velocityThreshold = 20;
  const elasticSpeed = isSafari() ? 0.125 : 0.075;

  const animate = () => {
    if (progress < 1) {
      progress = Math.min(progress + duration, 1);
      const easeFactor = easeFunction(progress);
      cursorX = startX + (mouseX - startX) * easeFactor;
      cursorY = startY + (mouseY - startY) * easeFactor;
    }

    const deltaX = mouseX - previousMouse.x;
    const deltaY = mouseY - previousMouse.y;
    previousMouse.x = mouseX;
    previousMouse.y = mouseY;

    const velocity = Math.min(
      Math.sqrt(deltaX ** 2 + deltaY ** 2) * 4,
      velocityClamp
    );
    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
    if (velocity > velocityThreshold) currentAngle = angle;

    if (isElastic && shape) {
      const scaleValue = (velocity / velocityClamp) * velocityScale;
      currentScale += (scaleValue - currentScale) * elasticSpeed;

      shape.style.translate = `0 0`;
      shape.style.rotate = `${currentAngle}deg`;
      shape.style.scale = `${1 + currentScale} ${1 - currentScale}`;
    }

    cursor.style.translate = `calc(${cursorX}px - 50%) calc(${cursorY}px - 50%)`;

    requestAnimationFrame(animate);
  };

  animate();

  document.addEventListener("mousemove", (e) => {
    if (!followMouse) return;

    cursor.style.opacity = 1;

    startX = cursorX;
    startY = cursorY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    progress = 0;
  });

  hideMouse.forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("hidden"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("hidden"));
  });

  const siblingHover = (
    triggerSelector,
    siblingSelector,
    activeClass = "",
    eventType = "mousemove"
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

        startX = cursorX;
        startY = cursorY;
        mouseX = centerX;
        mouseY = centerY;
        progress = 0;

        if (activeClass) {
          cursor.classList.add(activeClass);
        }
      });

      el.addEventListener("mouseleave", () => {
        followMouse = true;
        startX = cursorX;
        startY = cursorY;
        progress = 0;

        if (activeClass) {
          cursor.classList.remove(activeClass);
        }
      });
    });
  };

  siblingHover(".sibling-hover", ".sibling-hover__target", "test-class");
  siblingHover(
    ".sibling-hover-burger",
    ".sibling-hover-burger__target",
    "mouse-cursor--burger"
  );
}
