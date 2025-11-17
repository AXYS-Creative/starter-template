import { isSafari } from "../util.js";

const pushElems = document.querySelectorAll(".velocity-push");

if (pushElems.length) {
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
      lastX: 0,
      lastY: 0,
      velocityX: 0,
      velocityY: 0,
      offsetX: 0,
      offsetY: 0,
      rotate: 0,
      isAnimating: false,
      isTracking: false, // Track whether we should calculate velocity
    };

    const VELOCITY_THRESHOLD = 0.01;
    const VELOCITY_SCALE = 30; // px/frame for full strength

    // Update global velocity
    const updateVelocity = (e) => {
      if (state.isTracking) {
        state.velocityX = e.clientX - state.lastX;
        state.velocityY = e.clientY - state.lastY;
      } else {
        // First movement after scroll or page load - reset velocity
        state.velocityX = 0;
        state.velocityY = 0;
        state.isTracking = true;
      }
      state.lastX = e.clientX;
      state.lastY = e.clientY;
    };

    // Reset tracking on scroll to prevent stale velocity
    const resetTracking = () => {
      state.isTracking = false;
    };

    // Determine which edge cursor entered from
    const getEntryEdge = (rect, clientX, clientY) => {
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const distances = {
        top: relY,
        bottom: rect.height - relY,
        left: relX,
        right: rect.width - relX,
      };

      return Object.entries(distances).reduce(
        (min, [edge, dist]) => (dist < min.dist ? { edge, dist } : min),
        { edge: "top", dist: Infinity }
      ).edge;
    };

    // Calculate rotation based on entry edge and position
    const calculateRotation = (edge, relX, relY, w, h, velocityMag) => {
      if (config.maxRotate === 0) return 0;

      const edgeConfigs = {
        top: { norm: relX / w, sign: 1 },
        bottom: { norm: relX / w, sign: -1 },
        left: { norm: relY / h, sign: -1 },
        right: { norm: relY / h, sign: 1 },
      };

      const { norm, sign } = edgeConfigs[edge];
      const direction = norm * 2 - 1; // Map 0→1 to -1→1
      const baseRotate = direction * config.maxRotate * sign;

      // Velocity affects magnitude, direction stays consistent
      return baseRotate * velocityMag;
    };

    // Animation loop with easing
    const animate = () => {
      state.offsetX += (0 - state.offsetX) * config.restore;
      state.offsetY += (0 - state.offsetY) * config.restore;
      state.rotate += (0 - state.rotate) * config.restore;

      el.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) rotate(${state.rotate}deg)`;

      // Stop when movement is imperceptible
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

    // Event handlers
    el.addEventListener("mouseenter", (e) => {
      const rect = el.getBoundingClientRect();
      const edge = getEntryEdge(rect, e.clientX, e.clientY);

      // Apply push based on velocity
      state.offsetX = state.velocityX * config.strength;
      state.offsetY = state.velocityY * config.strength;

      // Calculate velocity magnitude (normalized 0-1)
      const velocityMag = Math.min(
        Math.sqrt(state.velocityX ** 2 + state.velocityY ** 2) / VELOCITY_SCALE,
        1
      );

      // Apply rotation
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      state.rotate = calculateRotation(edge, relX, relY, rect.width, rect.height, velocityMag);

      el.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) rotate(${state.rotate}deg)`;
      startAnimation();
    });

    el.addEventListener("mouseleave", startAnimation);

    window.addEventListener("mousemove", updateVelocity);
    window.addEventListener("scroll", resetTracking, { passive: true });
  });
}
