/**
 * cursor-content.js
 *
 * Shows a message or icon inside the cursor when hovering `.cursor-content`
 * elements.
 *
 * Supported data attributes on trigger elements:
 *   data-cursor-message      – text to display
 *   data-cursor-icon         – mask-image path for the icon
 *   data-cursor-icon-swap    – alternate icon path, toggled on click
 *   data-cursor-icon-color   – CSS color / variable (default: --color-font--primary)
 *   data-cursor-icon-size    – "sm" | "md" | "lg" (default: "sm")
 *   data-cursor-class        – extra class added to cursor while active
 */

import { cursor } from "./cursor-base.js";

if (cursor) {
  const triggers = document.querySelectorAll(".cursor-content");
  // if (!triggers.length) return;

  const messageEl = cursor.querySelector(".mouse-cursor__message");
  const iconEl = cursor.querySelector(".mouse-cursor__icon");

  // Snapshot defaults from the DOM so they can be restored on hide.
  const defaultIconPath = iconEl.style.maskImage
    .replace(/url\(['"]?(.*?)['"]?\)/, "$1")
    .trim();
  const defaultIconColor = "var(--color-font--primary)";
  const defaultIconSize = "sm";

  let hideTimeout = null;

  const applySize = (size) => {
    iconEl.classList.remove(
      "mouse-cursor__icon--sm",
      "mouse-cursor__icon--md",
      "mouse-cursor__icon--lg",
    );
    iconEl.classList.add(`mouse-cursor__icon--${size}`);
  };

  triggers.forEach((el) => {
    const messageText = el.dataset.cursorMessage || "";
    const iconPath = el.dataset.cursorIcon || "";
    const iconPathSwap = el.dataset.cursorIconSwap || "";
    const iconColor = el.dataset.cursorIconColor || defaultIconColor;
    const iconSize = el.dataset.cursorIconSize || defaultIconSize;
    const customClass = el.dataset.cursorClass || "";

    const hasMessage = Boolean(messageText);
    const hasIcon = iconPath !== "" || el.hasAttribute("data-cursor-icon");

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

      // Delay icon path reset to allow the hide transition to complete.
      hideTimeout = setTimeout(() => {
        iconEl.style.maskImage = `url('${defaultIconPath}')`;
        hideTimeout = null;
      }, 200);
    };

    const swapIcon = () => {
      if (!iconPathSwap) return;
      isSwapped = !isSwapped;
      iconEl.style.maskImage = `url('${isSwapped ? iconPathSwap : iconPath || defaultIconPath}')`;
    };

    el.addEventListener("mouseenter", showCursor);
    el.addEventListener("mouseleave", hideCursor);
    el.addEventListener("click", swapIcon);
  });
}
