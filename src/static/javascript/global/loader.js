import { mqNoMotion, globalConfig } from "../util.js";

const siteLoader = document.getElementById("site-loader");

// Always start with the loading class if loader exists
if (siteLoader) {
  document.body.setAttribute("data-body-loading", "");
}

// Use session storage for users that navigate away from the home page and then return (removes loader any future time unless revisting the page)
if (sessionStorage.getItem("visitedSite") && siteLoader) {
  // User has visited before — remove loader immediately
  siteLoader.style.display = "none";
  siteLoader.remove();
  document.body.removeAttribute("data-body-loading");
  document.body.setAttribute("data-body-loading-complete", "");

  // // Notify other areas of the app
  // window.dispatchEvent(new CustomEvent("loader:complete"));
} else if (siteLoader) {
  let pageLoaded = false;
  let timerDone = false;
  let loadDuration = globalConfig.loadDuration;

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
      sessionStorage.setItem("visitedSite", "true");

      // Notify other areas of the app
      window.dispatchEvent(new CustomEvent("loader:complete"));
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
