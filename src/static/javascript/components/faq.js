const faq = document.querySelector(".faq");

if (faq) {
  const faqBtns = document.querySelectorAll(".faq-btn");

  faqBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // FAQ behavior single - toggle this block to remove feature
      if (faq.classList.contains("single-faq")) {
        faqBtns.forEach((otherBtn) => {
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
