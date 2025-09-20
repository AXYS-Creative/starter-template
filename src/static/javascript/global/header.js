import { root, lenis } from "../util.js";

export const siteHeader = document.querySelector(".site-header"),
  headerLogoLink = document.querySelector(".site-header .site-logo-link"),
  menuBtn = document.querySelector(".site-nav-btn");

const siteNav = document.querySelector(".site-nav");

export const navLinks = document.querySelectorAll(".nav-link"),
  navFooterLinks = document.querySelectorAll(".nav-footer-link"),
  tabElementsPage = document.querySelectorAll(".tab-element-page"),
  tabElementsNav = document.querySelectorAll(".tab-element-nav");

let headerHeight = siteHeader.offsetHeight;
root.style.setProperty("--header-height", `${headerHeight}px`);

tabElementsNav.forEach((elem) => elem.setAttribute("tabIndex", "-1"));

let navScrollLock = siteNav.dataset.scrollLock === "true";

const toggleNav = () => {
  const isNavOpen = siteNav.getAttribute("aria-hidden") === "true";

  siteHeader.classList.toggle("site-header--nav-active");

  siteNav.setAttribute("aria-hidden", !isNavOpen);
  menuBtn.setAttribute("aria-expanded", isNavOpen);
  menuBtn.setAttribute(
    "aria-label",
    isNavOpen ? "Close navigation menu" : "Open navigation menu"
  );

  if (isNavOpen && navScrollLock) {
    lenis.stop();
    document.body.style.overflow = "hidden";
  } else {
    lenis.start();
    document.body.style.overflow = "auto";
  }

  // Update tabindex for tabElementsPage and tabElementsNav
  tabElementsPage.forEach((el) =>
    el.setAttribute("tabindex", isNavOpen ? "-1" : "0")
  );
  tabElementsNav.forEach((el) =>
    el.setAttribute("tabindex", isNavOpen ? "0" : "-1")
  );
};

const closeNav = () => {
  siteNav.setAttribute("aria-hidden", "true");
  menuBtn.setAttribute("aria-expanded", "false");

  siteHeader.classList.remove("site-header--nav-active");

  // Reset tabindex for tabElementsPage and tabElementsNav
  tabElementsPage.forEach((el) => el.setAttribute("tabindex", "0"));
  tabElementsNav.forEach((el) => el.setAttribute("tabindex", "-1"));
};

// Close nav when clicking any nav link (except those with prevent-nav-close class)
[...navLinks, ...navFooterLinks].forEach((link) => {
  if (!link.classList.contains("prevent-nav-close")) {
    link.addEventListener("click", closeNav);
  }
});

menuBtn?.addEventListener("click", toggleNav);
