import { mqMouse, mqMotionAllow } from "../utility.js";

if (mqMouse.matches && mqMotionAllow.matches) {
  document.querySelectorAll(".magnet").forEach((el) => {
    let targetX = 0,
      targetY = 0,
      currentX = 0,
      currentY = 0,
      ease = 0.2;

    let isAnimating = false;

    const stopThreshold = 0.01;

    const animateMagnet = () => {
      if (!isAnimating) return;

      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      el.style.translate = `${currentX}px ${currentY}px`;

      if (
        Math.abs(targetX - currentX) < stopThreshold &&
        Math.abs(targetY - currentY) < stopThreshold
      ) {
        isAnimating = false;
        currentX = targetX;
        currentY = targetY;
        return;
      }

      requestAnimationFrame(animateMagnet);
    };

    const startAnimation = () => {
      if (!isAnimating) {
        isAnimating = true;
        animateMagnet();
      }
    };

    el.addEventListener("mousemove", (e) => {
      const pos = el.getBoundingClientRect();
      const mx = e.clientX - pos.left - pos.width / 2;
      const my = e.clientY - pos.top - pos.height / 2;

      if (el.classList.contains("magnet-weak")) {
        targetX = mx * 0.12;
        targetY = my * 0.12;
      } else if (el.classList.contains("magnet-strong")) {
        targetX = mx * 0.96;
        targetY = my * 0.96;
      } else if (el.classList.contains("magnet-wide-btn")) {
        targetX = mx * 0.48;
        targetY = my * 0.96;
      } else {
        targetX = mx * 0.48;
        targetY = my * 0.48;
      }

      startAnimation();
    });

    el.addEventListener("mouseleave", () => {
      targetX = 0;
      targetY = 0;
      startAnimation();
    });
  });
}
