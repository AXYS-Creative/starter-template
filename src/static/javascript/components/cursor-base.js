import { mqMouse, isSafari, cubicBezier } from "../util.js";

export const cursor = document.querySelector(
  ".mouse-cursor, .mouse-cursor--elastic",
);

export const cursorState = {
  followMouse: true,
  anchored: false,
  activeTrigger: null,
};

// ─── Tilt Factory (Reusable Utility) ──────────────────────────────────────
/**
 * Factory for creating tilt controllers for any element.
 */
export const createTiltController = (element, config = {}) => {
  const {
    max = 25,
    velocityMax = 5000,
    inSpeed = 0.12,
    outSpeed = 0.12,
    idleMs = 90,
    reverse = false,
  } = config;

  let currentTilt = 0;
  let lastTiltTs = performance.now();
  let lastMoveTs = performance.now();
  let prevX = 0;
  let prevY = 0;

  return {
    update(mouseX, mouseY) {
      const now = performance.now();
      const dt = Math.max((now - lastTiltTs) / 1000, 1 / 240);
      lastTiltTs = now;

      const dx = mouseX - prevX;
      const dy = mouseY - prevY;

      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) lastMoveTs = now;
      prevX = mouseX;
      prevY = mouseY;

      const speedPxPerSec = Math.sqrt(dx * dx + dy * dy) / dt;
      const normalized = Math.min(Math.max(speedPxPerSec / velocityMax, 0), 1);

      const idle = now - lastMoveTs > idleMs;
      const targetTilt = idle
        ? 0
        : Math.sign(dx) * (reverse ? -1 : 1) * normalized * max;

      const speed = targetTilt === 0 ? outSpeed : inSpeed;
      currentTilt += (targetTilt - currentTilt) * speed;

      if (Math.abs(currentTilt) < 0.001) currentTilt = 0;

      element.style.rotate = `${currentTilt}deg`;
    },
  };
};

// ─── Core Logic ───────────────────────────────────────────────────────────
let mouseX = 0,
  mouseY = 0,
  cursorX = 0,
  cursorY = 0,
  startX = 0,
  startY = 0,
  progress = 0;

export const moveCursorTo = (x, y) => {
  startX = cursorX;
  startY = cursorY;
  mouseX = x;
  mouseY = y;
  progress = 0;
};

if (cursor) {
  const isElastic = cursor.dataset.elastic === "true";
  const shape = cursor.querySelector(".mouse-cursor__shape");
  const easeFunction = cubicBezier(0.29, 1.01, 0.16, 1.09);
  const duration = isSafari() ? 0.042 : 0.05;

  const mainTilt =
    cursor.dataset.tilt === "true"
      ? createTiltController(cursor, {
          max: Number.parseFloat(cursor.dataset.tiltMax),
          velocityMax: Number.parseFloat(
            cursor.dataset.tiltVelocityMax || 1800,
          ),
          inSpeed: Number.parseFloat(cursor.dataset.tiltInSpeed || 0.12),
          outSpeed: Number.parseFloat(cursor.dataset.tiltOutSpeed || 0.12),
          idleMs: Number.parseFloat(cursor.dataset.tiltIdleMs || 90),
          reverse: cursor.hasAttribute("data-tilt-reverse"),
        })
      : null;

  const previousMouse = { x: 0, y: 0 };
  let currentScale = 0,
    currentAngle = 0;
  const velocityScale = 0.5,
    velocityClamp = 150,
    velocityThreshold = 20,
    elasticSpeed = isSafari() ? 0.125 : 0.075;

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
      velocityClamp,
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

    if (mainTilt) mainTilt.update(mouseX, mouseY);

    requestAnimationFrame(animate);
  };
  animate();

  document.addEventListener("mousemove", (e) => {
    if (!cursorState.followMouse) return;
    cursor.style.opacity = 1;
    moveCursorTo(e.clientX, e.clientY);
  });

  // ─── Cursor-hide zones ────────────────────────────────────────────────────
  document.querySelectorAll(".cursor-hide").forEach((el) => {
    el.addEventListener("mousemove", () =>
      cursor.classList.add("cursor-hidden"),
    );
    el.addEventListener("mouseleave", () =>
      cursor.classList.remove("cursor-hidden"),
    );
  });
}
