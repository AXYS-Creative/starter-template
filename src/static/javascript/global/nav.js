const navMenu = document.querySelector(".nav-menu"),
  menuBtn = document.querySelector(".menu-btn"),
  siteHeader = document.querySelector(".site-header"),
  headerLogo = document.querySelector(".header-logo"),
  navLinks = document.querySelectorAll(".nav-link"),
  navFooterLinks = document.querySelectorAll(".nav-footer-link"),
  tabElementsPage = document.querySelectorAll(".tab-element-page"),
  tabElementsNav = document.querySelectorAll(".tab-element-nav");

tabElementsNav.forEach((elem) => elem.setAttribute("tabIndex", "-1"));

let isNavOpen;

const toggleNav = () => {
  navMenu.classList.toggle("menu-active");
  menuBtn.classList.toggle("menu-active");
  siteHeader.classList.toggle("menu-active");

  isNavOpen = navMenu.classList.contains("menu-active");

  navMenu.setAttribute("aria-hidden", !isNavOpen);
  menuBtn.setAttribute("aria-expanded", isNavOpen);

  // Update tabindex for tabElementsPage and tabElementsNav
  tabElementsPage.forEach((el) =>
    el.setAttribute("tabindex", isNavOpen ? "0" : "-1")
  );
  tabElementsNav.forEach((el) =>
    el.setAttribute("tabindex", isNavOpen ? "-1" : "0")
  );

  // Pevent scroll when nav is open
  document.body.style = `overflow: ${isNavOpen ? "hidden" : "auto"}`;
};

// Toggle nav and allow scrolling when resizing browser greater than 1024px
window.addEventListener("resize", () => {
  if (window.innerWidth > 1024 && isNavOpen) {
    navMenu.classList.remove("menu-active");
    menuBtn.classList.remove("menu-active");
    siteHeader.classList.remove("menu-active");

    document.body.style.overflow = "auto";

    navMenu.setAttribute("aria-hidden", true);
    menuBtn.setAttribute("aria-expanded", false);
    tabElementsPage.forEach((el) => el.setAttribute("tabindex", "0"));
    tabElementsNav.forEach((el) => el.setAttribute("tabindex", "0"));

    isNavOpen = false;
  }
});

const closeNav = () => {
  document.body.style = "overflow: auto;";

  navMenu.classList.remove("menu-active");
  menuBtn.classList.remove("menu-active");
  siteHeader.classList.remove("menu-active");

  navMenu.setAttribute("aria-hidden", "true");
  menuBtn.setAttribute("aria-expanded", "false");

  // Reset tabindex for tabElementsPage and tabElementsNav
  tabElementsPage.forEach((el) => el.setAttribute("tabindex", "0"));
  tabElementsNav.forEach((el) => el.setAttribute("tabindex", "-1"));
};

// [...navLinks, ...navFooterLinks].forEach((link) => {
[...navLinks].forEach((link) => {
  if (!link.classList.contains("prevent-nav-close")) {
    link.addEventListener("click", closeNav);
  }
});

menuBtn.addEventListener("click", toggleNav);

headerLogo.addEventListener("click", closeNav);
