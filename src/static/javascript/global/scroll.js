// Global - Animate when scrolling away from the top of the page (also restore when scrolling up)
const scrollFromTop = (() => {
  let siteHeader = document.querySelector(".site-header");
  let lastScrollY = 0;

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 120) {
      if (currentScrollY > lastScrollY) {
        // Scrolling down
        siteHeader.classList.add("away-from-top");
      } else {
        // Scrolling up
        siteHeader.classList.remove("away-from-top");
      }
    } else {
      siteHeader.classList.remove("away-from-top"); // Restore on scroll up
    }

    lastScrollY = currentScrollY;
  });
})();
