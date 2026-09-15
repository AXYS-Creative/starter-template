// ─────────────────────────────────────────────────────────────────────────
// Nav experience for the header-absolute instance (currently the /demo page).
// Keeps behaviour specific to this header out of the shared header.js /
// btn-nav.njk, which the other header templates also rely on.
//
// Current behaviour:
//   • Nav open  → pin the .dust-bg canvas to its light palette
//   • Nav closed → release it back to its normal (section/toggle) theming
//
// It reacts to the button's aria-expanded state rather than the raw click, so
// it stays decoupled from header.js's toggle logic and listener ordering, and
// still fires if the nav is opened/closed by any other code path.
// ─────────────────────────────────────────────────────────────────────────

const menuBtn = document.querySelector(".header-absolute #site-nav-btn");

if (menuBtn) {
  const syncDustTheme = () => {
    const navOpen = menuBtn.getAttribute("aria-expanded") === "true";
    window.dispatchEvent(
      new CustomEvent("dust-bg:theme", {
        detail: { theme: navOpen ? "light" : null },
      }),
    );
  };

  new MutationObserver(syncDustTheme).observe(menuBtn, {
    attributes: true,
    attributeFilter: ["aria-expanded"],
  });
}
