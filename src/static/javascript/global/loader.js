let pageLoaded = false;
let timerDone = false;
const loadDuration = 0; // Optional min-duration

const attemptCompleteLoading = () => {
  if (pageLoaded && timerDone) {
    const siteLoader = document.querySelector(".site-loader");

    siteLoader?.classList.add("load-complete");
    siteLoader?.setAttribute("aria-hidden", "true");

    console.log("Site loaded");
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
