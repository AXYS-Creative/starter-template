const alertEls = document.querySelectorAll(".alert");
const alertTriggers = document.querySelectorAll(".alert-trigger");

const hideAlert = (alertEl) => {
  alertEl.setAttribute("aria-hidden", true);
  alertEl.setAttribute("inert", "");
};

const showAlert = (alertEl) => {
  alertEl.setAttribute("aria-hidden", false);
  alertEl.removeAttribute("inert");

  // Nudge content so SRs announce it
  const msg = alertEl.querySelector(".alert-content__message");
  if (msg) {
    msg.textContent = msg.textContent; // aria-live - re-assign triggers live announcement
  }

  const autoClose = parseInt(alertEl.dataset.alertAutoclose, 10) || 0;
  const timerEl = alertEl.querySelector(".alert-timer");

  if (timerEl && autoClose > 0) {
    timerEl.style.transition = "none";
    timerEl.style.width = "0%";
    timerEl.offsetHeight; // force reflow
    timerEl.style.transition = `width ${autoClose}ms linear`;
    timerEl.style.width = "100%";
  }

  if (autoClose > 0) {
    setTimeout(() => hideAlert(alertEl), autoClose);
  }
};

alertEls.forEach((alertEl) => {
  alertEl.setAttribute("inert", "");

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
