const tooltipBtns = document.querySelectorAll(".tooltip__btn"),
  tooltipMessages = document.querySelectorAll(".tooltip__message");

tooltipBtns.forEach((btn, index) => {
  const message = tooltipMessages[index];

  btn.addEventListener("focus", () => {
    message.setAttribute("aria-hidden", "false");
  });

  btn.addEventListener("blur", () => {
    message.setAttribute("aria-hidden", "true");
  });

  btn.addEventListener("mouseenter", () => {
    message.setAttribute("aria-hidden", "false");
  });
  btn.addEventListener("mouseleave", () => {
    message.setAttribute("aria-hidden", "true");
  });
});
