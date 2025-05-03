import { mqMouse, mqMotionAllow } from "../util.js";

if (mqMouse.matches && mqMotionAllow.matches) {
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

// if (mqMouse.matches && mqMotionAllow.matches) {
//   document.querySelectorAll(".magnet").forEach((el) => {
//     let targetX = 0,
//       targetY = 0,
//       currentX = 0,
//       currentY = 0,
//       ease = 1;

//     let isAnimating = false;

//     const stopThreshold = 0.01;

//     const animateMagnet = () => {
//       if (!isAnimating) return;

//       currentX += (targetX - currentX) * ease;
//       currentY += (targetY - currentY) * ease;

//       el.style.translate = `${currentX}px ${currentY}px`;

//       if (
//         Math.abs(targetX - currentX) < stopThreshold &&
//         Math.abs(targetY - currentY) < stopThreshold
//       ) {
//         isAnimating = false;
//         currentX = targetX;
//         currentY = targetY;
//         return;
//       }

//       requestAnimationFrame(animateMagnet);
//     };

//     const startAnimation = () => {
//       if (!isAnimating) {
//         isAnimating = true;
//         animateMagnet();
//       }
//     };

//     el.addEventListener("mousemove", (e) => {
//       const pos = el.getBoundingClientRect();
//       const mx = e.clientX - pos.left - pos.width / 2;
//       const my = e.clientY - pos.top - pos.height / 2;

//       if (el.classList.contains("magnet-weak")) {
//         targetX = mx * 0.12;
//         targetY = my * 0.12;
//       } else if (el.classList.contains("magnet-strong")) {
//         targetX = mx * 0.96;
//         targetY = my * 0.96;
//       } else if (el.classList.contains("magnet-wide-btn")) {
//         targetX = mx * 0.48;
//         targetY = my * 0.96;
//       } else {
//         targetX = mx * 0.48;
//         targetY = my * 0.48;
//       }

//       startAnimation();
//     });

//     el.addEventListener("mouseleave", () => {
//       targetX = 0;
//       targetY = 0;
//       startAnimation();
//     });
//   });
// }
