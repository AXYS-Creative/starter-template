function initDisclosure(containerSelector, buttonSelector, options = {}) {
  const containers = document.querySelectorAll(containerSelector);

  containers.forEach((container) => {
    const buttons = container.querySelectorAll(buttonSelector);
    const singleOpen =
      options.forceSingleOpen ?? container.dataset.singleOpen === "true";

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (singleOpen) {
          buttons.forEach((otherBtn) => {
            if (otherBtn !== btn) {
              otherBtn.setAttribute("aria-expanded", "false");
            }
          });
        }

        const isExpanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", isExpanded ? "false" : "true");
      });
    });
  });
}

function setToggleAllState(toggleAllBtn, expanded) {
  toggleAllBtn.setAttribute("aria-expanded", expanded ? "true" : "false");

  const toggleAllText = toggleAllBtn.querySelector(".btn__text");
  if (toggleAllText) {
    toggleAllText.textContent = expanded
      ? toggleAllBtn.dataset.textClose
      : toggleAllBtn.dataset.textOpen;
  }
}

function initAccordionToggleAll() {
  const containers = document.querySelectorAll(".accordion");

  containers.forEach((container) => {
    const toggleAllBtn = container.querySelector(".accordion-toggle-all");
    if (!toggleAllBtn) return;

    const itemButtons = container.querySelectorAll(".accordion-btn");

    const syncToggleAllState = () => {
      const expandedStates = Array.from(itemButtons).map(
        (btn) => btn.getAttribute("aria-expanded") === "true",
      );
      const allExpanded = expandedStates.every(Boolean);
      const allCollapsed = expandedStates.every((expanded) => !expanded);

      // Only flip at the extremes — a mixed state leaves the button as-is.
      if (allExpanded) {
        setToggleAllState(toggleAllBtn, true);
      } else if (allCollapsed) {
        setToggleAllState(toggleAllBtn, false);
      }
    };

    toggleAllBtn.addEventListener("click", () => {
      const shouldExpand = toggleAllBtn.getAttribute("aria-expanded") !== "true";

      itemButtons.forEach((btn) => {
        btn.setAttribute("aria-expanded", shouldExpand ? "true" : "false");
      });

      setToggleAllState(toggleAllBtn, shouldExpand);
    });

    // Keep the toggle-all button in sync when items are opened/closed individually
    itemButtons.forEach((btn) => {
      btn.addEventListener("click", syncToggleAllState);
    });
  });
}

// Initialize accordions (optionally respect data-single-open)
initDisclosure(".accordion", ".accordion-btn");
initAccordionToggleAll();

// Initialize dropdown links (always allow multiple open)
initDisclosure(".dropdown-link", ".dropdown-link__trigger", {
  forceSingleOpen: false,
});
