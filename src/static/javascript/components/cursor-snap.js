/**
 * cursor-snap.js
 *
 * Snaps the cursor to a target element while hovering a trigger.
 *
 * Usage (HTML):
 *   <div data-cursor-target="my-element"
 *        data-cursor-class="is-active"   (optional)
 *        data-cursor-event="mouseenter"> (optional, default: "mousemove")
 *   </div>
 *
 * The target is resolved in this order:
 *   1. Nearest `.cursor-pair` ancestor → first child matching `.{selector}`
 *   2. First match for `.{selector}` in the document
 */

import { cursor, cursorState, moveCursorTo } from "./cursor-base.js";

if (cursor) {
  document.querySelectorAll("[data-cursor-target]").forEach((el) => {
    const targetSelector = el.dataset.cursorTarget;
    const activeClass = el.dataset.cursorClass || "";
    const eventType = el.dataset.cursorEvent || "mousemove";

    const wrapper = el.closest(".cursor-pair");
    const target =
      wrapper?.querySelector(`.${targetSelector}`) ||
      document.querySelector(`.${targetSelector}`);

    if (!target) return;

    el.addEventListener(eventType, () => {
      cursorState.followMouse = false;

      const rect = target.getBoundingClientRect();
      moveCursorTo(rect.left + rect.width / 2, rect.top + rect.height / 2);

      if (activeClass) cursor.classList.add(activeClass);
    });

    el.addEventListener("mouseleave", () => {
      cursorState.followMouse = true;
      if (activeClass) cursor.classList.remove(activeClass);
    });
  });
}
