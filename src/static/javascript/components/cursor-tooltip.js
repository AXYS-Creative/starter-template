/**
 * cursor-tooltip.js
 *
 * Floating tooltip that follows (or anchors to) the cursor.
 * Triggers are elements with the `.tooltip-util` class.
 *
 * Supported data attributes on trigger elements:
 *   data-tooltip-message    – tooltip text
 *   data-tooltip-min-width  – minimum width in px (default: 280)
 *
 * This is separate from tooltip.js, which handles paired aria-based tooltips
 * and has no dependency on the cursor.
 */

import { mqMaxMd } from "../util.js";
import { cursor, cursorState, moveCursorTo } from "./cursor-base.js";

if (cursor) {
  const triggers = document.querySelectorAll(".tooltip-util");
  const tooltipMessage = document.querySelector(".tooltip-util-message");

  // if (!triggers.length || !tooltipMessage) return;

  const edgeMargin = mqMaxMd ? 96 : 180;

  // ─── Quadrant positioning ─────────────────────────────────────────────────

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
      "center",
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

  // ─── Global listeners ─────────────────────────────────────────────────────

  document.addEventListener("mousemove", (e) => {
    // Release anchor when the mouse starts moving again.
    if (cursorState.anchored) {
      cursorState.followMouse = true;
      cursorState.anchored = false;
    }
    applyQuadrantClass(e.clientX, e.clientY);
  });

  window.addEventListener("scroll", () => {
    tooltipMessage.classList.remove("active");
    cursorState.anchored = false;
    cursorState.followMouse = true;
  });

  // ─── Per-trigger setup ────────────────────────────────────────────────────

  /**
   * Anchors the cursor and tooltip below the centre of an element.
   * Used for both focus and click interactions.
   */
  const anchorToElement = (el, message, minWidth) => {
    cursorState.followMouse = false;
    cursorState.anchored = true;

    tooltipMessage.textContent = message;
    tooltipMessage.classList.add("active");
    tooltipMessage.style.minWidth = `${minWidth}px`;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const belowY = rect.bottom + 8;

    moveCursorTo(centerX, belowY);
    applyQuadrantClass(centerX, belowY);
  };

  triggers.forEach((el) => {
    const message = el.dataset.tooltipMessage || "";
    const minWidth = el.dataset.tooltipMinWidth || 280;

    el.addEventListener("mouseenter", () => {
      cursorState.activeTrigger = el;
      cursorState.anchored = false;
      tooltipMessage.textContent = message;
      tooltipMessage.classList.add("active");
      tooltipMessage.style.minWidth = `${minWidth}px`;
    });

    el.addEventListener("mouseleave", () => {
      cursorState.activeTrigger = null;
      cursorState.anchored = false;
      tooltipMessage.classList.remove("active");
    });

    el.addEventListener("focus", () => anchorToElement(el, message, minWidth));
    el.addEventListener("click", () => anchorToElement(el, message, minWidth));

    el.addEventListener("blur", () => {
      cursorState.followMouse = true;
      cursorState.anchored = false;
      tooltipMessage.classList.remove("active");
    });
  });
}
