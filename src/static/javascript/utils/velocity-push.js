import { isSafari } from "../util.js";

const pushElems = document.querySelectorAll(".velocity-push");

if (pushElems.length) {
  // Shared velocity tracking for all elements
  const globalVelocity = {
    lastX: 0,
    lastY: 0,
    velocityX: 0,
    velocityY: 0,
    isTracking: false,
  };

  const VELOCITY_THRESHOLD = 0.01;
  const VELOCITY_SCALE = 30;
  const SCROLL_SETTLE_DELAY = 250; // ms to wait before re-enabling tracking. Only needed if using a smooth scroll library.

  let scrollTimeout = null;

  // Single global velocity updater
  const updateVelocity = (e) => {
    if (globalVelocity.isTracking) {
      globalVelocity.velocityX = e.clientX - globalVelocity.lastX;
      globalVelocity.velocityY = e.clientY - globalVelocity.lastY;
    } else {
      globalVelocity.velocityX = 0;
      globalVelocity.velocityY = 0;
      globalVelocity.isTracking = true;
    }
    globalVelocity.lastX = e.clientX;
    globalVelocity.lastY = e.clientY;
  };

  const resetTracking = () => {
    globalVelocity.isTracking = false;

    // Auto re-enable tracking after scroll settles
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      globalVelocity.isTracking = true;
    }, SCROLL_SETTLE_DELAY);
  };

  // Attach once for all elements
  window.addEventListener("mousemove", updateVelocity);
  window.addEventListener("scroll", resetTracking, { passive: true });

  pushElems.forEach((el) => {
    // Configuration
    const config = {
      strength: parseFloat(el.dataset.pushStrength) || 10,
      restore: parseFloat(el.dataset.pushRestore) || 0.1,
      maxRotate: parseFloat(el.dataset.pushRotateMax) || 25,
    };

    if (isSafari()) {
      config.strength /= 2.5;
    }

    // State
    const state = {
      offsetX: 0,
      offsetY: 0,
      rotate: 0,
      isAnimating: false,
    };

    // Calculate rotation based on position and velocity direction
    const calculateRotation = (relX, relY, w, h, velocityMag) => {
      if (config.maxRotate === 0) return 0;

      const centerX = (relX / w) * 2 - 1;
      const centerY = (relY / h) * 2 - 1;

      const isHorizontalPush =
        Math.abs(globalVelocity.velocityX) > Math.abs(globalVelocity.velocityY);

      let baseRotate;
      if (isHorizontalPush) {
        baseRotate = -centerY * Math.sign(globalVelocity.velocityX) * config.maxRotate;
      } else {
        baseRotate = centerX * Math.sign(globalVelocity.velocityY) * config.maxRotate;
      }

      return baseRotate * velocityMag;
    };

    // Animation loop with easing
    const animate = () => {
      state.offsetX += (0 - state.offsetX) * config.restore;
      state.offsetY += (0 - state.offsetY) * config.restore;
      state.rotate += (0 - state.rotate) * config.restore;

      el.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) rotate(${state.rotate}deg)`;

      if (
        Math.abs(state.offsetX) < VELOCITY_THRESHOLD &&
        Math.abs(state.offsetY) < VELOCITY_THRESHOLD &&
        Math.abs(state.rotate) < VELOCITY_THRESHOLD
      ) {
        state.offsetX = state.offsetY = state.rotate = 0;
        el.style.transform = "";
        state.isAnimating = false;
        return;
      }

      requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (!state.isAnimating) {
        state.isAnimating = true;
        requestAnimationFrame(animate);
      }
    };

    el.addEventListener("mouseenter", (e) => {
      const rect = el.getBoundingClientRect();

      state.offsetX = globalVelocity.velocityX * config.strength;
      state.offsetY = globalVelocity.velocityY * config.strength;

      const velocityMag = Math.min(
        Math.sqrt(globalVelocity.velocityX ** 2 + globalVelocity.velocityY ** 2) / VELOCITY_SCALE,
        1
      );

      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      state.rotate = calculateRotation(relX, relY, rect.width, rect.height, velocityMag);

      el.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) rotate(${state.rotate}deg)`;
      startAnimation();
    });

    el.addEventListener("mouseleave", startAnimation);
  });
}
