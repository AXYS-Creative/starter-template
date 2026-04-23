/**
 * cursor-field.js
 *
 * Declares a parent boundary within which a child element smoothly follows
 * the user's cursor. On mouse leave the child returns to its original position.
 *
 * Usage (HTML):
 *   <div data-cursor-field
 *        data-snap-ease="ease"         "instant" | "ease" | "spring" (default: "ease")
 *        data-snap-speed="0.08"        follow speed (default: 0.08)
 *        data-snap-return-speed="0.06" return speed (default: 0.06)
 *        data-snap-bounce="0.6"        spring overshoot 0–1 (default: 0.6, spring only)
 *   >
 *     <div data-cursor-field-child>...</div>
 *   </div>
 *
 * - The child is clamped to the parent boundary at all times.
 * - Original position is captured on init so the child always knows where home is.
 * - No dependency on cursor-base.js — runs its own rAF loop per field.
 */

import { cursorState } from "./cursor-base.js";

const fields = document.querySelectorAll("[data-cursor-field]");

fields.forEach((field) => {
  const child = field.querySelector("[data-cursor-field-child]");
  if (!child) return;

  // ─── Config ───────────────────────────────────────────────────────────────
  const easeMode = field.dataset.snapEase || "ease";
  const followSpeed = parseFloat(field.dataset.snapSpeed || "0.08");
  const returnSpeed = parseFloat(field.dataset.snapReturnSpeed || "0.06");
  const bounce = parseFloat(field.dataset.snapBounce || "0.6");

  // ─── State ────────────────────────────────────────────────────────────────
  let active = false;

  // Current translated position of the child (relative to its natural origin).
  let currentX = 0;
  let currentY = 0;

  // Target position the child is interpolating toward.
  let targetX = 0;
  let targetY = 0;

  // Spring physics state (only used when easeMode === "spring").
  let velocityX = 0;
  let velocityY = 0;

  let rafId = null;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Returns the maximum translation allowed so the child stays inside the
   * parent. Accounts for the child's own dimensions.
   */
  const getClampBounds = () => {
    const parentRect = field.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();

    const maxX = (parentRect.width - childRect.width) / 2;
    const maxY = (parentRect.height - childRect.height) / 2;

    return { maxX: Math.max(maxX, 0), maxY: Math.max(maxY, 0) };
  };

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /**
   * Converts a cursor client position to a translation offset relative to
   * the centre of the parent, then clamps it to the parent bounds.
   */
  const cursorToTarget = (clientX, clientY) => {
    const parentRect = field.getBoundingClientRect();
    const { maxX, maxY } = getClampBounds();

    const rawX = clientX - (parentRect.left + parentRect.width / 2);
    const rawY = clientY - (parentRect.top + parentRect.height / 2);

    return {
      x: clamp(rawX, -maxX, maxX),
      y: clamp(rawY, -maxY, maxY),
    };
  };

  // ─── Animation ────────────────────────────────────────────────────────────

  const lerp = (a, b, t) => a + (b - a) * t;

  const stepSpring = (current, target, velocity, speed, bounceFactor) => {
    const stiffness = speed * 2;
    const damping = 1 - bounceFactor * 0.9; // bounceFactor 0→heavy damping, 1→bouncy
    const force = (target - current) * stiffness;
    velocity = (velocity + force) * damping;
    return { value: current + velocity, velocity };
  };

  const tick = () => {
    const epsilon = 0.01;
    let stillMoving = false;

    if (easeMode === "instant") {
      currentX = targetX;
      currentY = targetY;
    } else if (easeMode === "spring") {
      const speed = active ? followSpeed : returnSpeed;

      const sx = stepSpring(currentX, targetX, velocityX, speed, bounce);
      const sy = stepSpring(currentY, targetY, velocityY, speed, bounce);

      currentX = sx.value;
      currentY = sy.value;
      velocityX = sx.velocity;
      velocityY = sy.velocity;

      if (
        Math.abs(currentX - targetX) > epsilon ||
        Math.abs(currentY - targetY) > epsilon ||
        Math.abs(velocityX) > epsilon ||
        Math.abs(velocityY) > epsilon
      ) {
        stillMoving = true;
      }
    } else {
      // "ease" — default
      const speed = active ? followSpeed : returnSpeed;
      currentX = lerp(currentX, targetX, speed);
      currentY = lerp(currentY, targetY, speed);

      if (
        Math.abs(currentX - targetX) > epsilon ||
        Math.abs(currentY - targetY) > epsilon
      ) {
        stillMoving = true;
      }
    }

    child.style.translate = `${currentX}px ${currentY}px`;

    // Stop the loop once the child has settled at its target.
    if (easeMode === "instant" || stillMoving) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };

  const startLoop = () => {
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  // ─── Events ───────────────────────────────────────────────────────────────

  field.addEventListener("mouseenter", () => {
    if (child.hasAttribute("data-cursor-tilt"))
      cursorState.activeTrigger = child;

    active = true;
    // Reset spring velocity on re-entry so previous motion doesn't carry over.
    velocityX = 0;
    velocityY = 0;
    startLoop();
  });

  field.addEventListener("mousemove", (e) => {
    if (child.hasAttribute("data-cursor-tilt"))
      cursorState.activeTrigger = child;

    const t = cursorToTarget(e.clientX, e.clientY);
    targetX = t.x;
    targetY = t.y;
    startLoop();
  });

  field.addEventListener("mouseleave", () => {
    cursorState.activeTrigger = null;

    active = false;
    targetX = 0;
    targetY = 0;
    startLoop();
  });
});
