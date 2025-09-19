// Toggle button (switch)
{
  const btnToggle = document.querySelectorAll(".btn-toggle");

  if (btnToggle) {
    btnToggle.forEach((btn) => {
      let btnLabel = btn.querySelector(".btn-toggle__label"),
        btnSwitch = btn.querySelector(".btn-toggle__switch"),
        btnLabelText = btnLabel?.innerHTML,
        btnLabelTrue = btnSwitch.getAttribute("data-label-true"),
        btnLabelFalse = btnSwitch.getAttribute("data-label-false");

      btn.addEventListener("click", () => {
        console.log("Toggle Button Clicked:", btn);
        let isPressed = btn.getAttribute("aria-pressed") === "true";

        btn.setAttribute("aria-pressed", (!isPressed).toString());
        btn.setAttribute(
          "aria-label",
          `${btnLabelText}${isPressed ? btnLabelTrue : btnLabelFalse}`
        );
      });
    });
  }
}

// Video Toggle
{
  const playButtons = document.querySelectorAll(".btn-video-toggle");

  playButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const isPressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", !isPressed);
    });
  });
}
