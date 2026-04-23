import { mqMouse, isSafari } from "../util.js";
import { cubicBezier } from "../util.js";

export const cursor = document.querySelector(
  ".mouse-cursor, .mouse-cursor--elastic",
);

/**
 * Shared cursor state.
 * Consumed and mutated by cursor-snap.js and cursor-tooltip.js.
 */
export const cursorState = {
  followMouse: true,
  anchored: false,
  activeTrigger: null,
};

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Instantly retargets the cursor's eased animation to (x, y).
 * Call this from any feature module rather than mutating position state directly.
 */
// ─── Position state ───────────────────────────────────────────────────────
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

// Nothing to initialise if there is no cursor element.
if (cursor) {
  const isElastic = cursor.dataset.elastic === "true";
  const tiltReverse = cursor.hasAttribute("data-tilt-reverse");
  const shape = cursor.querySelector(".mouse-cursor__shape");

  const easeFunction = cubicBezier(0.29, 1.01, 0.16, 1.09);
  const duration = isSafari() ? 0.042 : 0.05;

  // ─── Elastic (velocity-based squish) ─────────────────────────────────────
  const previousMouse = { x: 0, y: 0 };
  let currentScale = 0;
  let currentAngle = 0;
  const velocityScale = 0.5;
  const velocityClamp = 150;
  const velocityThreshold = 20;
  const elasticSpeed = isSafari() ? 0.125 : 0.075;

  // ─── Tilt (velocity-based rotation that eases back to 0 when idle) ────────
  const tiltMax = Number.parseFloat(cursor.dataset.tiltMax);
  const tiltVelocityMax = Number.parseFloat(
    cursor.dataset.tiltVelocityMax || "1800",
  );
  const tiltInSpeed = Number.parseFloat(cursor.dataset.tiltInSpeed || "0.12");
  const tiltOutSpeed = Number.parseFloat(cursor.dataset.tiltOutSpeed || "0.12");
  const tiltIdleMs = Number.parseFloat(cursor.dataset.tiltIdleMs || "90");
  const tiltEpsilon = 0.001;
  const tiltDirection = tiltReverse ? -1 : 1;

  let currentTilt = 0;
  let targetTilt = 0;
  let lastTiltTs = performance.now();
  let lastMoveTs = performance.now();
  let prevTiltMouseX = 0;
  let prevTiltMouseY = 0;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const updateTilt = () => {
    console.log(
      "activeTrigger:",
      cursorState.activeTrigger,
      "hasTilt:",
      cursorState.activeTrigger?.hasAttribute("data-cursor-tilt"),
    );

    const tiltEnabled =
      cursor.dataset.tilt === "true" ||
      cursorState.activeTrigger?.hasAttribute("data-cursor-tilt");

    if (!tiltEnabled) {
      // ease back to zero when tilt is not active
      currentTilt += (0 - currentTilt) * tiltOutSpeed;
      if (Math.abs(currentTilt) < tiltEpsilon) currentTilt = 0;
      cursor.style.rotate = `${currentTilt}deg`;
      return;
    }

    const now = performance.now();
    const dt = Math.max((now - lastTiltTs) / 1000, 1 / 240);
    lastTiltTs = now;

    const dx = mouseX - prevTiltMouseX;
    const dy = mouseY - prevTiltMouseY;

    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) lastMoveTs = now;

    prevTiltMouseX = mouseX;
    prevTiltMouseY = mouseY;

    const speedPxPerSec = Math.sqrt(dx * dx + dy * dy) / dt;
    const normalized = clamp(speedPxPerSec / tiltVelocityMax, 0, 1);

    const idle = now - lastMoveTs > tiltIdleMs;

    if (idle) {
      targetTilt = 0;
    } else {
      const dir = dx === 0 ? 0 : Math.sign(dx) * tiltDirection;
      targetTilt = dir * normalized * tiltMax;
    }

    const speed = targetTilt === 0 ? tiltOutSpeed : tiltInSpeed;
    currentTilt += (targetTilt - currentTilt) * speed;

    if (Math.abs(currentTilt) < tiltEpsilon) currentTilt = 0;

    cursor.style.rotate = `${currentTilt}deg`;
  };

  // ─── Animation loop ───────────────────────────────────────────────────────
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

    // updateTilt(); // infinite loop

    requestAnimationFrame(animate);
  };

  animate();

  // ─── Core mouse tracking ──────────────────────────────────────────────────
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
