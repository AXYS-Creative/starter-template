const faq = document.querySelector(".faq");

if (faq) {
  const faqBtns = document.querySelectorAll(".faq-btn");

  faqBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.setAttribute(
        "aria-expanded",
        btn.getAttribute("aria-expanded") === "true" ? "false" : "true"
      );
    });
  });
}
