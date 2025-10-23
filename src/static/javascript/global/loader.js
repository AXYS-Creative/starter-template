import { mqNoMotion } from "../util.js";

const siteLoader = document.getElementById("site-loader");

// Always start with the loading class if loader exists
if (siteLoader) {
  document.body.setAttribute("data-body-loading", "");
}

// Use session storage for users that navigate away from the home page and then return (removes loader any future time unless revisting the page)
if (sessionStorage.getItem("visitedSite") && siteLoader) {
  // User has visited before — remove loader immediately
  siteLoader.remove();
  document.body.removeAttribute("data-body-loading");
  document.body.setAttribute("data-body-loading-complete", "");
} else if (siteLoader) {
  let pageLoaded = false;
  let timerDone = false;
  const loadDuration = 0; // Seconds NOT Miliseconds

  // Skip animations for reduced-motion users
  if (mqNoMotion) {
    siteLoader.classList.add("load-complete");
    siteLoader.setAttribute("aria-hidden", "true");
    sessionStorage.setItem("visitedSite", "true");
    document.body.setAttribute("data-body-loading-complete", "");
  }

  const attemptCompleteLoading = () => {
    if (pageLoaded && timerDone) {
      siteLoader.classList.add("load-complete");
      siteLoader.setAttribute("aria-hidden", "true");
      document.body.removeAttribute("data-body-loading");
      document.body.setAttribute("data-body-loading-complete", "");
    }
  };

  window.addEventListener("load", () => {
    pageLoaded = true;
    requestAnimationFrame(attemptCompleteLoading);
  });

  setTimeout(() => {
    timerDone = true;
    attemptCompleteLoading();
  }, loadDuration * 1000);

  siteLoader.addEventListener("transitionend", () => {
    siteLoader.remove();
    document.body.classList.remove("is-loading");
  });
}
