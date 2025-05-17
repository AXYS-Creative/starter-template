import { mqMouse, isSafari } from "../util.js";
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

  const duration = isSafari() ? 0.048 : 0.032; // Edit duration here

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

  // prettier-ignore
  siblingHover(".sibling-hover", ".sibling-hover__target", "test-class");
}

// Elastic cursor
if (document.querySelector(".mouse-cursor--elastic")) {
  const elasticCursor = document.querySelector(".mouse-cursor--elastic");

  const mouse = { x: 0, y: 0 };
  const previousMouse = { x: 0, y: 0 };
  const circle = { x: 0, y: 0 };

  let currentScale = 0;
  let currentAngle = 0;

  window.addEventListener("mousemove", (e) => {
    elasticCursor.style.opacity = 1;

    mouse.x = e.x;
    mouse.y = e.y;
  });

  // Smoothing factor for cursor movement speed (0 = smoother, 1 = instant)
  const speed = 0.17;

  // Start animation
  const tick = () => {
    // MOVE
    circle.x += (mouse.x - circle.x) * speed;
    circle.y += (mouse.y - circle.y) * speed;
    const translateTransform = `translate(${circle.x}px, ${circle.y}px)`;

    // SQUEEZE
    const deltaMouseX = mouse.x - previousMouse.x;
    const deltaMouseY = mouse.y - previousMouse.y;
    previousMouse.x = mouse.x;
    previousMouse.y = mouse.y;
    const mouseVelocity = Math.min(
      Math.sqrt(deltaMouseX ** 2 + deltaMouseY ** 2) * 4,
      150
    );
    const scaleValue = (mouseVelocity / 150) * 0.5;
    currentScale += (scaleValue - currentScale) * speed;
    const scaleTransform = `scale(${1 + currentScale}, ${1 - currentScale})`;

    // ROTATE
    const angle = (Math.atan2(deltaMouseY, deltaMouseX) * 180) / Math.PI;

    if (mouseVelocity > 20) {
      currentAngle = angle;
    }

    const rotateTransform = `rotate(${currentAngle}deg)`;
    elasticCursor.style.transform = `${translateTransform} ${rotateTransform} ${scaleTransform}`;
    window.requestAnimationFrame(tick);
  };

  // Start the animation loop
  tick();
}
