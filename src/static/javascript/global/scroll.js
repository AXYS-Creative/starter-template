let minMd = window.matchMedia("(min-width: 768px)");

const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

const siteHeader = document.querySelector(".site-header"),
  navMenu = document.querySelector(".nav-menu"),
  menuBtnWrapper = document.querySelector(".menu-btn-wrapper"),
  menuBtn = document.querySelector(".menu-btn");

//
// All Scroll Animations that require SCRUBBING
//

const checkScroll = () => {
  const scrollPosition = window.scrollY;
  const windowHeight = window.innerHeight;

  // Header/Nav scroll logic
  const isNavOpen = navMenu.classList.contains("menu-active");

  if (scrollPosition >= 24) {
    siteHeader.classList.add("scroll-active");

    menuBtn.setAttribute("aria-hidden", "false");
    menuBtn.removeAttribute("tabindex");
  } else {
    siteHeader.classList.remove("scroll-active");

    menuBtn.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("tabindex", "-1");
  }

  if (scrollPosition < 24 && isNavOpen) {
    menuBtnWrapper.classList.add("menu-wrapper-page-top");
  } else {
    menuBtnWrapper.classList.remove("menu-wrapper-page-top");
  }

  // Text background fill animations

  // Helper function for broken subtext
  function getOffsetTop(elem) {
    let offsetTop = 0;
    do {
      if (!isNaN(elem.offsetTop)) {
        offsetTop += elem.offsetTop;
      }
    } while ((elem = elem.offsetParent));
    return offsetTop;
  }
};

window.addEventListener("scroll", throttle(checkScroll, 50)); // Throttle checkScroll, adjust 100ms as needed
