let pageLoaded = false;
let timerDone = false;
const loadDuration = 0; // Optional min-duration
const siteLoader = document.querySelector(".site-loader");

if (siteLoader) {
  const attemptCompleteLoading = () => {
    if (pageLoaded && timerDone) {
      siteLoader?.classList.add("load-complete");
      siteLoader?.setAttribute("aria-hidden", "true");
    }
  };

  window.addEventListener("load", () => {
    pageLoaded = true;
    attemptCompleteLoading();
  });

  setTimeout(() => {
    timerDone = true;
    attemptCompleteLoading();
  }, loadDuration);
}
