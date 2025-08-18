const copyButtons = document.querySelectorAll(".clipboard-copy__button");

copyButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const targetId = btn.getAttribute("data-copy-target");
    const target = document.getElementById(targetId);
    const btnTextEl = btn.querySelector(".clipboard-copy__button-text");
    const btnTextBase = btnTextEl.textContent;
    const btnTextActive = btnTextEl.dataset.buttonTextActive;

    console.log(btnTextActive);

    if (target) {
      const targetText = target.innerText || target.textContent;

      try {
        await navigator.clipboard.writeText(targetText);
        btnTextEl.textContent = btnTextActive;
        btn.setAttribute("aria-label", "Copied to clipboard");

        // Reset after 2 seconds
        setTimeout(() => {
          btnTextEl.textContent = btnTextBase;
          btn.setAttribute("aria-label", "Copy to clipboard");
        }, 2000);
      } catch (err) {
        console.error("Failed to copy: ", err);
      }
    }
  });
});
