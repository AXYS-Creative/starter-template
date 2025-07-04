const accordions = document.querySelectorAll(".accordion");

accordions.forEach((accordion) => {
  const accordionBtns = accordion.querySelectorAll(".accordion-btn");
  let singleOpen = accordion.dataset.singleOpen === "true";

  accordionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (singleOpen) {
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
