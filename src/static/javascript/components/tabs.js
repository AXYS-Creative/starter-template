// Shared logic for the component and utility. Also pulls in compatability utils/attributes with toggle-slider.js

document.querySelectorAll(".tabs").forEach((tabs) => {
  const panels = tabs.querySelectorAll(".tabs-panel");
  let btns = tabs.querySelectorAll(".tabs-option");
  let tabList = tabs.querySelector(".tabs-list");

  // Check parent flag
  const sliderMode = tabs.dataset.toggleSlider; // "solid", "underline", or undefined
  const useSlider = Boolean(sliderMode);

  // If no tablist/buttons exist, generate them
  if (!btns.length) {
    tabList = document.createElement("div");
    tabList.className = "tabs-list";
    tabList.setAttribute("role", "tablist");

    // Conditionally add slider classes
    if (useSlider) {
      tabList.classList.add("toggle-slider");
      tabList.classList.add(`toggle-slider--${sliderMode}`);
    }

    tabs.prepend(tabList);

    panels.forEach((panel, i) => {
      const id = `${tabs.classList[1] || "tabs"}-${i}`;
      const label = panel.dataset.tabLabel || `Tab ${i + 1}`;

      panel.id = id;
      panel.setAttribute("role", "tabpanel");

      const btn = document.createElement("button");
      btn.className = "tabs-option tab-element-page";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", id);
      btn.textContent = label;

      // Conditionally add tabs-option class for slider styling
      if (useSlider) btn.classList.add("tabs-option");

      tabList.appendChild(btn);
    });

    // Conditionally append the floating slider
    if (useSlider) {
      const toggleSlider = document.createElement("div");
      toggleSlider.className = "toggle-slider__slider";
      tabList.prepend(toggleSlider);
    }

    btns = tabList.querySelectorAll(".tab-element-page");
  }

  // Activate tab helper
  function activateTab(index) {
    btns.forEach((b, i) => {
      const panel = panels[i];
      const active = i === index;
      b.setAttribute("aria-selected", active);
      panel.hidden = !active;
    });
  }

  // Init: find first panel without [hidden], fallback to 0
  let initialIndex = Array.from(panels).findIndex(
    (p) => !p.hasAttribute("hidden")
  );
  if (initialIndex === -1) initialIndex = 0;
  activateTab(initialIndex);

  // Events
  btns.forEach((btn, i) => {
    btn.addEventListener("click", () => activateTab(i));
  });
});
