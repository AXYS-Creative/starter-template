import { mqMouse, isSafari } from "../utility.js";

const cursor = document.querySelector(".mouse-cursor");
const hideMouse = document.querySelectorAll(".hide-mouse");

if (mqMouse.matches) {
  // Mouse movement
  {
    let mouseX = 0,
      mouseY = 0;
    let cursorX = 0,
      cursorY = 0;
    let ease = 0.1;
    if (isSafari()) {
      ease = 0.2;
    }

    const animateCursor = () => {
      const dx = mouseX - cursorX;
      const dy = mouseY - cursorY;

      cursorX += dx * ease;
      cursorY += dy * ease;

      cursor.style.translate = `calc(${cursorX}px - 50%) calc(${cursorY}px - 50%)`;

      requestAnimationFrame(animateCursor);
    };

    animateCursor();

    document.addEventListener("mousemove", (e) => {
      cursor.style.opacity = 1; // opacity: 0 via inline style

      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }

  // Mouse hover
  hideMouse.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cursor.classList.add("hidden");
    });
    el.addEventListener("mouseleave", () => {
      cursor.classList.remove("hidden");
    });
  });
}
