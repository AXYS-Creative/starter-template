document.querySelectorAll(".tabs").forEach((tabs) => {
  const panels = tabs.querySelectorAll(".tabs__panel");
  let btns = tabs.querySelectorAll(".tabs__btn");
  let tabList = tabs.querySelector(".tabs__list");

  // If no tablist/buttons exist, generate them
  if (!btns.length) {
    tabList = document.createElement("div");
    tabList.className = "tabs__list";
    tabList.setAttribute("role", "tablist");
    tabs.prepend(tabList);

    panels.forEach((panel, i) => {
      const id = `${tabs.classList[1] || "tabs"}-${i}`; // unique ID per instance
      const label = panel.dataset.tabLabel || `Tab ${i + 1}`;

      panel.id = id;
      panel.setAttribute("role", "tabpanel");

      const btn = document.createElement("button");
      btn.className = "tabs__btn tab-element-page"; // tabindex
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", id);
      btn.textContent = label;
      tabList.appendChild(btn);
    });

    btns = tabList.querySelectorAll(".tabs__btn");
  }

  // Activate tab helper
  function activateTab(index) {
    btns.forEach((b, i) => {
      const panel = panels[i];
      const active = i === index;
      b.setAttribute("aria-selected", active);
      panel.hidden = !active;
      b.classList.toggle("tabs__btn--active", active);
    });
  }

  // Init: first tab open
  activateTab(0);

  // Events
  btns.forEach((btn, i) => {
    btn.addEventListener("click", () => activateTab(i));
  });
});
