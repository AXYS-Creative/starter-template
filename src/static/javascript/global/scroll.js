// Global - Animate when scrolling away from the top of the page (also restore when scrolling up)
let siteHeader = document.querySelector(".site-header");
let lastScrollY = 0;

window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;

  if (currentScrollY > 120) {
    if (currentScrollY > lastScrollY) {
      siteHeader.classList.add("away-from-top"); // Scrolling down
    } else {
      siteHeader.classList.remove("away-from-top"); // Scrolling up
    }
  } else {
    siteHeader.classList.remove("away-from-top"); // Back at top
  }

  lastScrollY = currentScrollY;
});
