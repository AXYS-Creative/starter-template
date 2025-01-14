const accordion = document.querySelector(".accordion");

if (accordion) {
  const accordionBtns = document.querySelectorAll(".accordion-btn");

  accordionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // accordion behavior single - toggle this block to remove feature
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
}
