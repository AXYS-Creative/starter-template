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

// Initialize accordions (optionally respect data-single-open)
initDisclosure(".accordion", ".accordion-btn");

// Initialize dropdown links (always allow multiple open)
initDisclosure(".dropdown-link", ".dropdown-link__trigger", {
  forceSingleOpen: false,
});
