import { root, lenis } from "../util.js";

export const siteHeader = document.querySelector("#site-header"),
  headerLogoLink = document.querySelector("#site-header .site-logo-link"),
  menuBtn = document.querySelector(".site-nav-btn"),
  siteNav = document.querySelector(".site-nav");

export const navLinks = document.querySelectorAll(".nav-link"),
  navFooterLinks = document.querySelectorAll(".nav-footer-link"),
  tabElementsPage = document.querySelectorAll(".tab-element-page"),
  tabElementsNav = document.querySelectorAll(".tab-element-nav");

export let headerHeight = siteHeader.offsetHeight;
root.style.setProperty("--header-height", `${headerHeight}px`);

siteNav.setAttribute("tabIndex", "-1"); // Keep this, was able to tab the nav initially
tabElementsNav.forEach((elem) => elem.setAttribute("tabIndex", "-1"));

let navScrollLock = siteNav.dataset.scrollLock === "true";

// Track the current focus scope globally
let currentScope = "page";

function updateTabScope(scope) {
  currentScope = scope; // keep in sync
  const pageEls = document.querySelectorAll(".tab-element-page");
  const navEls = document.querySelectorAll(".tab-element-nav");

  pageEls.forEach((el) => (el.tabIndex = scope === "page" ? 0 : -1));
  navEls.forEach((el) => (el.tabIndex = scope === "nav" ? 0 : -1));
}

const toggleNav = () => {
  const isNavOpen = siteNav.getAttribute("aria-hidden") === "true";

  siteHeader.classList.toggle("site-header--nav-active");

  siteNav.setAttribute("aria-hidden", !isNavOpen);
  menuBtn.setAttribute("aria-expanded", isNavOpen);
  menuBtn.setAttribute("aria-label", isNavOpen ? "Close navigation menu" : "Open navigation menu");

  if (isNavOpen && navScrollLock) {
    lenis.stop();
    document.body.style.overflow = "hidden";
  } else {
    lenis.start();
    document.body.style.overflow = "auto";
  }

  updateTabScope(isNavOpen ? "nav" : "page");
};

const closeNav = () => {
  siteNav.setAttribute("aria-hidden", "true");
  menuBtn.setAttribute("aria-expanded", "false");

  siteHeader.classList.remove("site-header--nav-active");

  updateTabScope("page");
};

// Close nav when clicking any nav link (except those with prevent-nav-close class)
[...navLinks, ...navFooterLinks].forEach((link) => {
  if (!link.classList.contains("prevent-nav-close")) {
    link.addEventListener("click", closeNav);
  }
});

menuBtn?.addEventListener("click", toggleNav);

// 🔎 MutationObserver ensures newly added tab-elements also get the right tabindex
const observer = new MutationObserver(() => {
  updateTabScope(currentScope);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Debug: Log any focused element
// document.addEventListener(
//   "focus",
//   (e) => {
//     console.log("Focused element:", e.target);
//   },
//   true
// );
