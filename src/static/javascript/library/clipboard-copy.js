const clipboardCopyBtns = document.querySelectorAll(".clipboard-copy-btn");

clipboardCopyBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.copyTarget;
    const target = document.getElementById(targetId);
    const btnTextEl = btn.querySelector(".clipboard-copy-btn__text");
    const btnTextBase = btnTextEl.textContent;
    const btnTextActive = btnTextEl.dataset.btnTextActive;
    const btnTextSwapTime = parseInt(btnTextEl.dataset.btnTextSwapTime, 10);

    if (target) {
      const targetText = target.innerText || target.textContent;

      navigator.clipboard.writeText(targetText);
      btnTextEl.textContent = btnTextActive;
      btn.setAttribute("aria-label", "Copied to clipboard");

      setTimeout(() => {
        btnTextEl.textContent = btnTextBase;
        btn.setAttribute("aria-label", "Copy to clipboard");
      }, btnTextSwapTime);
    }
  });
});
