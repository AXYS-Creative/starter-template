const alertEls = document.querySelectorAll(".alert");
const alertTriggers = document.querySelectorAll(".alert-trigger");

const setAlertTabIndex = (alertEl, index) => {
  const focusables = [
    alertEl.querySelector(".alert__close-btn"),
    alertEl.querySelector(".alert-content__link-1"),
    alertEl.querySelector(".alert-content__link-2"),
  ].filter(Boolean); // remove nulls

  focusables.forEach((el) => (el.tabIndex = index));
};

const hideAlert = (alertEl) => {
  alertEl.classList.remove("alert--active");
  setAlertTabIndex(alertEl, -1);
};

const showAlert = (alertEl) => {
  alertEl.classList.add("alert--active");
  setAlertTabIndex(alertEl, 0);
};

alertEls.forEach((alertEl) => {
  setAlertTabIndex(alertEl, -1);

  const closeBtn = alertEl.querySelector(".alert__close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => hideAlert(alertEl));
  }
});

alertTriggers.forEach((trigger) => {
  const targetId = trigger.getAttribute("aria-controls");
  const alertEl = document.getElementById(`alert-${targetId}`);
  const autoClose = parseInt(alertEl.dataset.alertAutoclose, 10) || 0;

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    showAlert(alertEl);

    if (autoClose > 0) {
      setTimeout(() => hideAlert(alertEl), autoClose);
    }
  });
});
