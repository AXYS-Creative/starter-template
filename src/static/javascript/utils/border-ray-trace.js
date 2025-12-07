import { ColorUtils } from "../util.js";

const rayTraceElems = document.querySelectorAll(".border-ray-trace");
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
  rayTraceElems.forEach((el, index) => {
    if (!el.id) {
      el.id = `border-ray-trace-${index}`;
    }

    let style = rayTraceData.get(el)?.style;
    if (!style) {
      style = document.createElement("style");
      style.id = `border-ray-trace-style-${index}`;
      document.head.appendChild(style);
    }

    const rect = el.getBoundingClientRect();

    // Use ColorUtils to parse the color
    const customColor = el.getAttribute("data-border-ray-trace-color");
    const primaryColor = ColorUtils.parseColor(customColor, el) || { r: 102, g: 126, b: 234 };

    rayTraceData.set(el, {
      style,
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
    const { style, centerX, centerY, width, height, left, top, primaryColor } = data;

    const localX = ((mouseX - left) / width) * 100;
    const localY = ((mouseY - top) / height) * 100;

    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));

    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const intensity = 1 - normalizedDistance;
    const opacity = 0.3 + intensity * 0.7;

    // Use ColorUtils.toRgbaString for cleaner gradient generation
    const gradient = `radial-gradient(circle at ${localX}% ${localY}%, ${ColorUtils.toRgbaString(
      primaryColor,
      opacity
    )} 0%, ${ColorUtils.toRgbaString(primaryColor, opacity * 0.7)} 30%, ${ColorUtils.toRgbaString(
      primaryColor,
      opacity * 0.4
    )} 60%, ${ColorUtils.toRgbaString(primaryColor, opacity * 0.2)} 100%)`;

    style.textContent = `#${el.id}::before { background: ${gradient} !important; }`;
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
