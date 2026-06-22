import { cursorState, createTiltController } from "./cursor-base.js";

const fields = document.querySelectorAll("[data-cursor-field]");

fields.forEach((field) => {
  const child = field.querySelector("[data-cursor-field-child]");
  if (!child) return;

  // ─── Config ───────────────────────────────────────────────────────────────
  const easeMode = field.dataset.snapEase || "ease";
  const followSpeed = parseFloat(field.dataset.snapSpeed || "0.08");
  const returnSpeed = parseFloat(field.dataset.snapReturnSpeed || "0.06");
  const bounce = parseFloat(field.dataset.snapBounce || "0.6");

  // ─── Tilt Controller ──────────────────────────────────────────────────────
  // Initialize tilt if the attribute exists on the child
  const tilt = child.hasAttribute("data-cursor-tilt")
    ? createTiltController(child, {
        max: Number.parseFloat(child.dataset.tiltMax || "25"),
        velocityMax: Number.parseFloat(child.dataset.tiltVelocityMax || "1800"),
        inSpeed: Number.parseFloat(child.dataset.tiltInSpeed || "0.12"),
        outSpeed: Number.parseFloat(child.dataset.tiltOutSpeed || "0.12"),
        idleMs: Number.parseFloat(child.dataset.tiltIdleMs || "90"),
        reverse: child.hasAttribute("data-tilt-reverse"),
      })
    : null;

  // ─── State ────────────────────────────────────────────────────────────────
  let active = false;
  let currentX = 0,
    currentY = 0;
  let targetX = 0,
    targetY = 0;
  let velocityX = 0,
    velocityY = 0;
  let rafId = null;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getClampBounds = () => {
    const parentRect = field.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    const maxX = (parentRect.width - childRect.width) / 2;
    const maxY = (parentRect.height - childRect.height) / 2;
    return { maxX: Math.max(maxX, 0), maxY: Math.max(maxY, 0) };
  };

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const cursorToTarget = (clientX, clientY) => {
    const parentRect = field.getBoundingClientRect();
    const { maxX, maxY } = getClampBounds();
    const rawX = clientX - (parentRect.left + parentRect.width / 2);
    const rawY = clientY - (parentRect.top + parentRect.height / 2);
    return { x: clamp(rawX, -maxX, maxX), y: clamp(rawY, -maxY, maxY) };
  };

  // ─── Animation ────────────────────────────────────────────────────────────
  const lerp = (a, b, t) => a + (b - a) * t;

  const stepSpring = (current, target, velocity, speed, bounceFactor) => {
    const stiffness = speed * 2;
    const damping = 1 - bounceFactor * 0.9;
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
      )
        stillMoving = true;
    } else {
      const speed = active ? followSpeed : returnSpeed;
      currentX = lerp(currentX, targetX, speed);
      currentY = lerp(currentY, targetY, speed);
      if (
        Math.abs(currentX - targetX) > epsilon ||
        Math.abs(currentY - targetY) > epsilon
      )
        stillMoving = true;
    }

    child.style.translate = `${currentX}px ${currentY}px`;

    // Trigger tilt update
    if (tilt) tilt.update(targetX, targetY);

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
    active = true;
    velocityX = 0;
    velocityY = 0;
    startLoop();
  });

  field.addEventListener("mousemove", (e) => {
    const t = cursorToTarget(e.clientX, e.clientY);
    targetX = t.x;
    targetY = t.y;
    startLoop();
  });

  field.addEventListener("mouseleave", () => {
    active = false;
    targetX = 0;
    targetY = 0;
    startLoop();
  });
});
