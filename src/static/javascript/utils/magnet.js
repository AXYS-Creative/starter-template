import { mqMouse, mqMotionAllow } from "../util.js";

if (mqMouse && mqMotionAllow) {
  document.querySelectorAll(".magnet").forEach((el) => {
    let mouseX = 0;
    let mouseY = 0;
    let elX = 0;
    let elY = 0;
    let animFrame;

    // Default values
    let xStrength = 0.5;
    let yStrength = 0.5;
    const easing = 1; // Leave at 1. Control ease with CSS.

    // Optional modifiers via utility classes
    if (el.classList.contains("magnet-weak")) {
      xStrength = 0.25;
      yStrength = 0.25;
    } else if (el.classList.contains("magnet-strong")) {
      xStrength = 0.75;
      yStrength = 0.75;
    } else if (el.classList.contains("magnet-wide-btn")) {
      // xStrength = 0.5;
      yStrength = 1;
    }

    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = e.clientX - centerX;
      const distY = e.clientY - centerY;

      mouseX = distX * xStrength;
      mouseY = distY * yStrength;
    };

    const animate = () => {
      elX += (mouseX - elX) * easing;
      elY += (mouseY - elY) * easing;

      el.style.transform = `translate(${elX}px, ${elY}px)`;
      animFrame = requestAnimationFrame(animate);
    };

    const onMouseEnter = () => {
      document.addEventListener("mousemove", onMouseMove);
      animate();
    };

    const onMouseLeave = () => {
      document.removeEventListener("mousemove", onMouseMove);
      mouseX = 0;
      mouseY = 0;
    };

    el.addEventListener("mouseenter", onMouseEnter);
    el.addEventListener("mouseleave", onMouseLeave);
  });
}
