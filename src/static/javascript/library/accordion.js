const accordions = document.querySelectorAll(".accordion");

accordions.forEach((accordion) => {
  const accordionBtns = accordion.querySelectorAll(".accordion-btn");

  accordionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Check if this specific accordion has 'single-accordion'
      if (accordion.classList.contains("single-accordion")) {
        accordionBtns.forEach((otherBtn) => {
          if (otherBtn !== btn) {
            otherBtn.setAttribute("aria-expanded", "false");
          }
        });
      }

      btn.setAttribute(
        "aria-expanded",
        btn.getAttribute("aria-expanded") === "true" ? "false" : "true"
      );
    });
  });
});
