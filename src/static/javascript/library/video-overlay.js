import { tabElementsPage } from "../global/nav.js";
import { headerLogo, menuBtn } from "../global/header.js";
import { lenis } from "../util.js";

const videoOverlay = document.querySelector(".video-overlay"),
  videoPlayer = document.querySelector(".video-player"),
  videoCloseBtn = document.querySelector(".video-overlay__close");

const videoToggle = document.querySelectorAll(".video-toggle");

let nonVideoOverlayTabElements = [...tabElementsPage, headerLogo, menuBtn];

videoCloseBtn?.setAttribute("tabindex", "-1");

// For Dropbox, replace end of link's string to allow video embed
if (videoToggle) {
  videoToggle.forEach((btn) => {
    const updatedSrc = btn.getAttribute("data-src").replace("dl=0", "raw=1");
    btn.setAttribute("data-src", updatedSrc);
  });
}

export let isvideoOverlayOpen = false;

export const openvideoOverlay = (src) => {
  isvideoOverlayOpen = true;

  videoOverlay.setAttribute("aria-hidden", !isvideoOverlayOpen);
  videoOverlay.classList.remove("video-overlay--inactive");

  if (src) videoPlayer.src = src; // Inject video source

  videoCloseBtn.focus();

  videoOverlay.setAttribute("tabindex", "0");
  videoCloseBtn.setAttribute("tabindex", "0");
  nonVideoOverlayTabElements.forEach((el) => el.setAttribute("tabindex", "-1"));

  lenis.stop();

  // // Notify other modules about the state change (from old sunder site)
  // document.dispatchEvent(
  //   new CustomEvent("videoOverlayStateChange", {
  //     detail: isvideoOverlayOpen,
  //   })
  // );
};

videoToggle?.forEach((btn) => {
  let vidSrc = btn.getAttribute("data-src");

  btn.addEventListener("click", () => {
    openvideoOverlay(vidSrc);
  });
});

export const closevideoOverlay = () => {
  isvideoOverlayOpen = false;

  videoOverlay.setAttribute("aria-hidden", "true");
  videoOverlay.classList.add("video-overlay--inactive");

  setTimeout(() => {
    videoPlayer.src = ""; // Remove src to stop the video
  }, 300);

  videoOverlay.setAttribute("tabindex", "-1");
  videoCloseBtn.setAttribute("tabindex", "-1");
  nonVideoOverlayTabElements.forEach((el) => el.setAttribute("tabindex", "0"));

  lenis.start();

  // // Notify other modules about the state change
  // document.dispatchEvent(
  //   new CustomEvent("videoOverlayStateChange", {
  //     detail: isvideoOverlayOpen,
  //   })
  // );
};

// Close the video player when clicking outside the embed
videoOverlay?.addEventListener("click", (e) => {
  if (e.target.classList.contains("video-overlay")) {
    closevideoOverlay();
  }
});

videoCloseBtn?.addEventListener("click", () => closevideoOverlay());
