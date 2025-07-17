// Global - Animate when scrolling away from the top of the page (also restore when scrolling up)
let siteHeader = document.querySelector(".site-header");
let lastScrollY = 0;

window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  let awayFromTop = currentScrollY > 24;
  let scrollingDown = currentScrollY > lastScrollY;
  let nearBottom = currentScrollY + windowHeight >= documentHeight - 120; // Adjust threshold as needed

  if (awayFromTop) {
    siteHeader.classList.add("site-header--away-from-top");
  } else {
    siteHeader.classList.remove("site-header--away-from-top");
  }

  if (scrollingDown && awayFromTop) {
    siteHeader.classList.add("site-header--scrolling-down");
  } else {
    siteHeader.classList.remove("site-header--scrolling-down");
  }

  if (nearBottom) {
    siteHeader.classList.add("site-header--near-bottom");
  } else {
    siteHeader.classList.remove("site-header--near-bottom");
  }

  lastScrollY = currentScrollY;
});
