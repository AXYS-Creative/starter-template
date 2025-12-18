import { ColorUtils } from "../util.js";

const rayTraceElems = document.querySelectorAll("[data-gradient-border-ray-trace]");
const rayTraceData = new Map();

let maxDistance = Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2));

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    maxDistance = Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2));
    updateElementCache();
  }, 150);
});

function updateElementCache() {
  rayTraceElems.forEach((el) => {
    const rect = el.getBoundingClientRect();

    // Parse the color using ColorUtils (handles any CSS color format)
    const colorValue = getComputedStyle(el).getPropertyValue("--gradient-border-color").trim();
    const primaryColor = ColorUtils.parseColor(colorValue, el) || { r: 255, g: 255, b: 255 };

    rayTraceData.set(el, {
      rect,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      primaryColor,
    });
  });
}

updateElementCache();

let mouseX = 0;
let mouseY = 0;
let rafId = null;

function updateBorders() {
  rayTraceData.forEach((data, el) => {
    const { centerX, centerY, width, height, left, top, primaryColor } = data;

    const localX = ((mouseX - left) / width) * 100;
    const localY = ((mouseY - top) / height) * 100;

    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const intensity = 1 - normalizedDistance;
    const opacity = 0.3 + intensity * 0.7;

    // Set CSS custom properties
    el.style.setProperty("--gradient-x", `${localX}%`);
    el.style.setProperty("--gradient-y", `${localY}%`);
    el.style.setProperty("--gradient-opacity", opacity);
    // Use a SEPARATE variable for RGB values
    el.style.setProperty(
      "--gradient-border-color-rgb",
      `${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}`
    );
  });

  rafId = null;
}

document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (!rafId) {
    rafId = requestAnimationFrame(updateBorders);
  }
});

let scrollTimeout;
document.addEventListener(
  "scroll",
  () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateElementCache, 100);
  },
  { passive: true }
);
