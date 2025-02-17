const tabsBtn = document.querySelectorAll(".tabs__btn");
const tabsPanel = document.querySelectorAll(".tabs__panel");

if (tabsBtn.length > 0 && tabsPanel.length > 0) {
  // Set first tab as active by default
  tabsBtn[0].classList.add("tabs__btn--active");
  tabsPanel[0].classList.remove("tabs__panel--hidden");
}

tabsBtn.forEach((button, index) => {
  button.addEventListener("click", () => {
    tabsBtn.forEach((btn) => btn.classList.remove("tabs__btn--active"));

    tabsPanel.forEach((content) =>
      content.classList.add("tabs__panel--hidden")
    );

    button.classList.add("tabs__btn--active");

    const activeTab = document.querySelector(`#tabs__panel-${index + 1}`);
    if (activeTab) {
      activeTab.classList.remove("tabs__panel--hidden");
    }
  });
});
