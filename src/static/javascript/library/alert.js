const alertEls = document.querySelectorAll(".alert"),
  alertTriggers = document.querySelectorAll(".alert-trigger");

alertEls.forEach((el) => {
  const closeBtn = el.querySelector(".alert__close-btn");

  if (closeBtn) {
    closeBtn.tabIndex = -1;

    closeBtn.addEventListener("click", () => {
      el.classList.remove("alert--active");
      closeBtn.tabIndex = -1;
    });
  }
});

alertTriggers.forEach((trigger) => {
  const triggerTarget = trigger.getAttribute("aria-controls");
  const alertEl = document.getElementById(`alert-${triggerTarget}`);
  const closeBtn = alertEl.querySelector(".alert__close-btn");
  const alertAutoClose = alertEl.dataset.alertAutoclose;

  trigger.addEventListener("click", (e) => {
    e.preventDefault();

    alertEl.classList.add("alert--active");

    if (closeBtn) {
      closeBtn.tabIndex = 0;
    }

    if (alertAutoClose > 0) {
      setTimeout(() => {
        alertEl.classList.remove("alert--active");
      }, alertAutoClose);
    }
  });
});
