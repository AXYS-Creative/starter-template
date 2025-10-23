import { isSafari } from "../../util.js";

const pushElems = document.querySelectorAll(".velocity-push");

if (pushElems.length) {
  pushElems.forEach((el) => {
    let strength = parseFloat(el.dataset.pushStrength) || 10;
    let restore = parseFloat(el.dataset.pushRestore) || 0.1; // Higher = faster
    let maxRotate = parseFloat(el.dataset.pushRotateMax) || 25; // 0 disables rotation

    if (isSafari()) {
      strength = strength / 2.5; // Reduce strength for Safari
    }

    let lastX = 0;
    let lastY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let rotate = 0;
    let isAnimating = false;

    // Track global velocity
    const updateVelocity = (e) => {
      velocityX = e.clientX - lastX;
      velocityY = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    window.addEventListener("mousemove", updateVelocity);

    const animate = () => {
      offsetX += (0 - offsetX) * restore;
      offsetY += (0 - offsetY) * restore;
      rotate += (0 - rotate) * restore;

      el.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)`;

      if (Math.abs(offsetX) < 0.01 && Math.abs(offsetY) < 0.01 && Math.abs(rotate) < 0.01) {
        offsetX = offsetY = rotate = 0;
        el.style.transform = "";
        isAnimating = false;
        return;
      }

      requestAnimationFrame(animate);
    };

    el.addEventListener("mouseenter", (e) => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      // Determine closest entry edge
      const topDist = relY;
      const bottomDist = h - relY;
      const leftDist = relX;
      const rightDist = w - relX;
      const minDist = Math.min(topDist, bottomDist, leftDist, rightDist);

      let edge = "top";
      if (minDist === topDist) edge = "top";
      else if (minDist === bottomDist) edge = "bottom";
      else if (minDist === leftDist) edge = "left";
      else if (minDist === rightDist) edge = "right";

      // Push translation
      const pushX = velocityX * strength;
      const pushY = velocityY * strength;
      offsetX = pushX;
      offsetY = pushY;

      // Velocity magnitude (normalized)
      const velocityMag = Math.min(Math.sqrt(velocityX ** 2 + velocityY ** 2) / 30, 1); // scale 0–1 (30px/frame ≈ full strength)

      // Rotation (blend position + velocity)
      if (maxRotate > 0) {
        let norm, dir, baseRotate;
        switch (edge) {
          case "top":
            norm = relX / w; // 0 left → 1 right
            dir = norm * 2 - 1; // -1 to 1
            baseRotate = dir * maxRotate;
            break;
          case "bottom":
            norm = relX / w;
            dir = norm * 2 - 1;
            baseRotate = -dir * maxRotate;
            break;
          case "left":
            norm = relY / h;
            dir = norm * 2 - 1;
            baseRotate = -dir * maxRotate;
            break;
          case "right":
            norm = relY / h;
            dir = norm * 2 - 1;
            baseRotate = dir * maxRotate;
            break;
        }

        // Blend with velocity intensity
        rotate = baseRotate * velocityMag;
      }

      el.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)`;

      if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(animate);
      }
    });

    el.addEventListener("mouseleave", () => {
      if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(animate);
      }
    });
  });
}
