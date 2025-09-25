import { headerLogoLink, menuBtn, tabElementsPage } from "../global/header.js";
import { lenis } from "../util.js";

const videoOverlay = document.querySelector(".video-overlay"),
  videoPlayer = document.querySelector(".video-player"),
  videoCloseBtn = document.querySelector(".video-overlay__close");

const videoToggle = document.querySelectorAll(".video-toggle");

const nonVideoOverlayTabElements = [
  ...tabElementsPage,
  headerLogoLink,
  menuBtn,
];

videoPlayer?.setAttribute("tabindex", "-1");
videoCloseBtn?.setAttribute("tabindex", "-1");

// For Dropbox, replace end of link's string to allow video embed
if (videoToggle) {
  videoToggle.forEach((btn) => {
    const updatedSrc = btn
      .getAttribute("data-vid-src")
      .replace("dl=0", "raw=1");
    btn.setAttribute("data-vid-src", updatedSrc);
  });
}

export const openVideoOverlay = (src) => {
  videoOverlay.setAttribute("aria-hidden", "false");
  videoOverlay.hidden = false;

  if (src) videoPlayer.src = src; // Inject video source

  videoCloseBtn.focus();

  videoOverlay.setAttribute("tabindex", "0");
  videoPlayer.setAttribute("tabindex", "0");
  videoCloseBtn.setAttribute("tabindex", "0");
  nonVideoOverlayTabElements.forEach((el) =>
    el?.setAttribute("tabindex", "-1")
  );

  lenis.stop();
};

videoToggle?.forEach((btn) => {
  let vidSrc = btn.getAttribute("data-vid-src");

  btn.addEventListener("click", () => {
    openVideoOverlay(vidSrc);
    btn.setAttribute("aria-expanded", "true");
  });
});

export const closeVideoOverlay = () => {
  videoOverlay.setAttribute("aria-hidden", "true");
  videoOverlay.hidden = true;

  videoToggle?.forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
    btn.focus(); // Since overlay exists outside of main, this helps restore focus when closing overlay (vs going to footer)
  });

  videoPlayer.pause();

  setTimeout(() => {
    videoPlayer.removeAttribute("src");
    videoPlayer.load();
  }, 300);

  videoOverlay.setAttribute("tabindex", "-1");
  videoCloseBtn.setAttribute("tabindex", "-1");
  nonVideoOverlayTabElements.forEach((el) => el?.setAttribute("tabindex", "0"));

  lenis.start();
};

// Close the video player when clicking outside the embed
videoOverlay?.addEventListener("click", (e) => {
  if (e.target.classList.contains("video-overlay")) {
    closeVideoOverlay();
  }
});

videoCloseBtn?.addEventListener("click", () => closeVideoOverlay());
