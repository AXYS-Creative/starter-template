import { mqMouse, mqMaxMd, isSafari } from "../util.js";
import { cubicBezier } from "../global/animations.js";

const cursor = document.querySelector(".mouse-cursor, .mouse-cursor--elastic");

const cursorHide = document.querySelectorAll(".cursor-hide"),
  cursorContent = document.querySelectorAll(".cursor-content");

// commenting this line for tooltip util
// if (cursor && mqMouse) {
if (cursor) {
  const isElastic = cursor.dataset.elastic === "true";
  const shape = cursor.querySelector(".mouse-cursor__shape");

  let followMouse = true;
  let anchored = false;

  let mouseX = 0,
    mouseY = 0,
    cursorX = 0,
    cursorY = 0,
    startX = 0,
    startY = 0,
    progress = 0;

  const easeFunction = cubicBezier(0.29, 1.01, 0.16, 1.09);
  const duration = isSafari() ? 0.042 : 0.05;

  const previousMouse = { x: 0, y: 0 };
  let currentScale = 0;
  let currentAngle = 0;
  const velocityScale = 0.5;
  const velocityClamp = 150;
  const velocityThreshold = 20;
  const elasticSpeed = isSafari() ? 0.125 : 0.075;

  // Helper to instantly jump target
  const moveCursorTo = (x, y) => {
    startX = cursorX;
    startY = cursorY;
    mouseX = x;
    mouseY = y;
    progress = 0;
  };

  const animate = () => {
    if (progress < 1) {
      progress = Math.min(progress + duration, 1);
      const easeFactor = easeFunction(progress);
      cursorX = startX + (mouseX - startX) * easeFactor;
      cursorY = startY + (mouseY - startY) * easeFactor;
    }

    const deltaX = mouseX - previousMouse.x;
    const deltaY = mouseY - previousMouse.y;
    previousMouse.x = mouseX;
    previousMouse.y = mouseY;

    const velocity = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2) * 4, velocityClamp);
    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
    if (velocity > velocityThreshold) currentAngle = angle;

    if (isElastic && shape) {
      const scaleValue = (velocity / velocityClamp) * velocityScale;
      currentScale += (scaleValue - currentScale) * elasticSpeed;
      shape.style.translate = `0 0`;
      shape.style.rotate = `${currentAngle}deg`;
      shape.style.scale = `${1 + currentScale} ${1 - currentScale}`;
    }

    cursor.style.translate = `calc(${cursorX}px - 50%) calc(${cursorY}px - 50%)`;
    requestAnimationFrame(animate);
  };

  animate();

  document.addEventListener("mousemove", (e) => {
    if (!followMouse) return;
    cursor.style.opacity = 1;
    moveCursorTo(e.clientX, e.clientY);
  });

  cursorHide.forEach((el) => {
    el.addEventListener("mousemove", () => cursor.classList.add("cursor-hidden"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("cursor-hidden"));
  });

  //
  // Cursor target hover snap
  //
  {
    const triggers = document.querySelectorAll("[data-cursor-target]");

    triggers.forEach((el) => {
      const targetSelector = el.dataset.cursorTarget;
      const activeClass = el.dataset.cursorClass || "";
      const eventType = el.dataset.cursorEvent || "mousemove";

      const wrapper = el.closest(".cursor-pair");
      let target =
        wrapper?.querySelector(`.${targetSelector}`) ||
        document.querySelector(`.${targetSelector}`);

      if (!target) return;

      el.addEventListener(eventType, () => {
        followMouse = false;

        const rect = target.getBoundingClientRect();
        moveCursorTo(rect.left + rect.width / 2, rect.top + rect.height / 2);

        if (activeClass) cursor.classList.add(activeClass);
      });

      el.addEventListener("mouseleave", () => {
        followMouse = true;
        moveCursorTo(cursorX, cursorY);
        if (activeClass) cursor.classList.remove(activeClass);
      });
    });
  }

  //
  // Cursor Content (message or icon)
  //
  {
    const messageEl = cursor.querySelector(".mouse-cursor__message"),
      iconEl = cursor.querySelector(".mouse-cursor__icon");

    // Extract defaults once
    const defaultIconPath = iconEl.style.maskImage.replace(/url\(['"]?(.*?)['"]?\)/, "$1").trim();
    const defaultIconColor = "var(--color-font--primary)";
    const defaultIconSize = "sm"; // sm | md | lg

    let hideTimeout = null; // Track the timeout

    const applySize = (size) => {
      iconEl.classList.remove(
        "mouse-cursor__icon--sm",
        "mouse-cursor__icon--md",
        "mouse-cursor__icon--lg"
      );
      iconEl.classList.add(`mouse-cursor__icon--${size}`);
    };

    // Elements that control the cursor (can display message or icon)
    cursorContent.forEach((el) => {
      const messageText = el.dataset.cursorMessage || "";
      const iconPath = el.dataset.cursorIcon || "";
      const iconPathSwap = el.dataset.cursorIconSwap || "";
      const iconColor = el.dataset.cursorIconColor || defaultIconColor;
      const iconSize = el.dataset.cursorIconSize || defaultIconSize;
      const customClass = el.dataset.cursorClass || "";

      const hasMessage = Boolean(messageText);
      const hasIcon = iconPath !== "" || el.hasAttribute("data-cursor-icon");

      // Track state per element
      let isSwapped = false;

      const showCursor = () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }

        if (hasMessage) {
          messageEl.textContent = messageText;
          cursor.classList.add("show-message");
        } else if (hasIcon) {
          iconEl.style.maskImage = `url('${iconPath || defaultIconPath}')`;
          iconEl.style.backgroundColor = iconColor;
          applySize(iconSize);
          cursor.classList.add("show-icon");
        }

        if (customClass) cursor.classList.add(customClass);
      };

      const hideCursor = () => {
        messageEl.textContent = "";
        cursor.classList.remove("show-message", "show-icon");

        if (customClass) cursor.classList.remove(customClass);

        iconEl.style.backgroundColor = defaultIconColor;
        applySize(defaultIconSize);

        hideTimeout = setTimeout(() => {
          iconEl.style.maskImage = `url('${defaultIconPath}')`;
          hideTimeout = null;
        }, 200);
      };

      // Experimental icon swap
      const swapIcon = () => {
        if (!iconPathSwap) return; // skip if no swap defined
        isSwapped = !isSwapped;
        const newPath = isSwapped ? iconPathSwap : iconPath || defaultIconPath;
        iconEl.style.maskImage = `url('${newPath}')`;
      };

      el.addEventListener("mouseenter", showCursor);
      el.addEventListener("mouseleave", hideCursor);
      el.addEventListener("click", swapIcon);
    });
  }

  //
  // Tooltip
  //
  (() => {
    const tooltipTriggers = document.querySelectorAll(".tooltip-util");
    const tooltipMessage = document.querySelector(".tooltip-util-message");
    const edgeMargin = mqMaxMd ? 96 : 180;

    const applyQuadrantClass = (x, y) => {
      tooltipMessage.classList.remove(
        "top",
        "bottom",
        "left",
        "right",
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "center"
      );

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isTop = y < edgeMargin;
      const isBottom = y > vh - edgeMargin;
      const isLeft = x < edgeMargin;
      const isRight = x > vw - edgeMargin;

      if (isTop && isLeft) tooltipMessage.classList.add("top-left");
      else if (isTop && isRight) tooltipMessage.classList.add("top-right");
      else if (isBottom && isLeft) tooltipMessage.classList.add("bottom-left");
      else if (isBottom && isRight) tooltipMessage.classList.add("bottom-right");
      else if (isTop) tooltipMessage.classList.add("top");
      else if (isBottom) tooltipMessage.classList.add("bottom");
      else if (isLeft) tooltipMessage.classList.add("left");
      else if (isRight) tooltipMessage.classList.add("right");
      else tooltipMessage.classList.add("center");
    };

    document.addEventListener("mousemove", (e) => {
      if (anchored) {
        followMouse = true;
        anchored = false;
      }

      applyQuadrantClass(e.clientX, e.clientY);
    });

    window.addEventListener("scroll", () => {
      tooltipMessage.classList.remove("active");
      anchored = false;
      followMouse = true;
    });

    tooltipTriggers.forEach((el) => {
      const message = el.dataset.tooltipMessage || "";
      const minWidth = el.dataset.tooltipMinWidth || 280;

      el.addEventListener("mouseenter", () => {
        anchored = false;
        tooltipMessage.textContent = message;
        tooltipMessage.classList.add("active");
        tooltipMessage.style.minWidth = `${minWidth}px`;
      });

      el.addEventListener("mouseleave", () => {
        anchored = false;
        tooltipMessage.classList.remove("active");
      });

      el.addEventListener("focus", () => {
        followMouse = false;
        anchored = true;
        tooltipMessage.textContent = message;
        tooltipMessage.classList.add("active");
        tooltipMessage.style.minWidth = `${minWidth}px`;

        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const belowY = rect.bottom + 8;

        moveCursorTo(centerX, belowY);
        applyQuadrantClass(centerX, belowY);
      });

      el.addEventListener("click", () => {
        followMouse = false;
        anchored = true;
        tooltipMessage.textContent = message;
        tooltipMessage.classList.add("active");
        tooltipMessage.style.minWidth = `${minWidth}px`;

        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const belowY = rect.bottom + 8;

        moveCursorTo(centerX, belowY);
        applyQuadrantClass(centerX, belowY);
      });

      el.addEventListener("blur", () => {
        followMouse = true;
        anchored = false;
        tooltipMessage.classList.remove("active");
      });
    });
  })();
}
