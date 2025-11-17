document.querySelectorAll("[class*='toggle-slider']").forEach((container) => {
  const options = container.querySelectorAll("[class*='option']");
  const slider = container.querySelector("[class*='slider']");

  if (!options.length || !slider) return;

  let activeOption =
    container.querySelector(".option-active") ||
    container.querySelector("input:checked")?.closest("[class*='option']") ||
    container.querySelector("[aria-selected='true']") ||
    Array.from(options).find((opt) => !opt.hasAttribute("hidden")) ||
    options[0];

  // Ensure it has the class at init
  options.forEach((o) => o.classList.remove("option-active"));
  activeOption.classList.add("option-active");

  const moveSlider = (target) => {
    const option = target?.closest("[class*='option']");
    if (!option) return;
    const { offsetLeft, offsetWidth } = option;
    slider.style.left = `${offsetLeft}px`;
    slider.style.width = `${offsetWidth}px`;
  };

  // Init after layout is ready
  requestAnimationFrame(() => moveSlider(activeOption));

  // Hover effect (delegated to container)
  container.addEventListener("mouseover", (e) => {
    const option = e.target.closest("[class*='option']");
    if (option && container.contains(option)) {
      moveSlider(option);
    }
  });

  container.addEventListener("mouseleave", () => {
    moveSlider(activeOption);
  });

  // Update active option when clicked
  options.forEach((option) => {
    option.addEventListener("click", () => {
      const input = option.querySelector(
        "input[type=radio], input[type=checkbox]"
      );
      if (input) input.checked = true; // sync input state if present

      options.forEach((o) => o.classList.remove("option-active"));
      option.classList.add("option-active");

      activeOption = option;
      moveSlider(activeOption);
    });

    // If option has an input, listen for changes too
    const input = option.querySelector(
      "input[type=radio], input[type=checkbox]"
    );
    if (input) {
      input.addEventListener("change", () => {
        if (input.checked) {
          options.forEach((o) => o.classList.remove("option-active"));
          option.classList.add("option-active");

          activeOption = option;
          moveSlider(activeOption);
        }
      });
    }
  });

  // Handle window resize
  window.addEventListener("resize", () => moveSlider(activeOption));
});
