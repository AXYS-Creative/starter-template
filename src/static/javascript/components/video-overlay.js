import { lenis } from "../util.js";
import { cursor } from "./cursor-base.js";

const TRIGGERS = "[data-video-src], [data-vid-src], .video-toggle";
const CLOSE_ICON = "/static/img/icon-google-x-lg.svg";
const TEARDOWN_MS = 300;

let dialog = null;
let video = null;
let activeToggle = null;
let teardownTimer = null;

// Dropbox share links need raw=1 to stream; real sites should self-host
const getSrc = (toggle) =>
  (toggle.dataset.videoSrc || toggle.dataset.vidSrc || "").replace(
    /([?&])dl=0/,
    "$1raw=1",
  );

const build = () => {
  dialog = document.createElement("dialog");
  dialog.className = "video-overlay";
  dialog.innerHTML = `
    <video class="video-overlay__video" controls playsinline preload="metadata"></video>
    <button type="button" class="btn btn-type--solid btn--icon-only btn--bg-slide video-overlay__close" data-btn-slide="up" aria-label="Close video" autofocus>
      <span class="btn__icon-group">
        <span class="btn__icon-end icon-svg" style="mask-image: url('${CLOSE_ICON}');" aria-hidden="true"></span>
      </span>
    </button>`;
  video = dialog.querySelector("video");

  dialog
    .querySelector(".video-overlay__close")
    .addEventListener("click", () => dialog.close());

  // The dialog fills the viewport, so a click on itself is a backdrop click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    if (cursor) document.body.append(cursor);
    video.pause();
    lenis.start();
    activeToggle?.focus();
    activeToggle = null;
    teardownTimer = setTimeout(() => {
      video.removeAttribute("src");
      video.removeAttribute("poster");
      video.querySelectorAll("track").forEach((track) => track.remove());
      video.load();
    }, TEARDOWN_MS);
  });

  document.body.append(dialog);
};

export const openVideoOverlay = (toggle) => {
  const src = getSrc(toggle);
  if (!src) return;
  if (!dialog) build();
  clearTimeout(teardownTimer);
  activeToggle = toggle;

  const { videoTitle, videoPoster, videoCaptions, videoCaptionsLang } =
    toggle.dataset;
  dialog.setAttribute(
    "aria-label",
    videoTitle || toggle.textContent.trim() || "Video",
  );

  video.querySelectorAll("track").forEach((track) => track.remove());
  if (videoCaptions) {
    const track = document.createElement("track");
    Object.assign(track, {
      kind: "captions",
      src: videoCaptions,
      srclang: videoCaptionsLang || "en",
      label: "Captions",
      default: true,
    });
    video.append(track);
  }

  if (videoPoster) video.poster = videoPoster;
  else video.removeAttribute("poster");
  video.src = src;

  dialog.showModal();
  if (cursor) dialog.append(cursor); // The top layer sits above any z-index
  lenis.stop();
  video.play().catch(() => {}); // blocked autoplay just leaves the controls
};

export const closeVideoOverlay = () => dialog?.close();

document.querySelectorAll(TRIGGERS).forEach((toggle) => {
  toggle.setAttribute("aria-haspopup", "dialog");
});

document.addEventListener("click", (e) => {
  const toggle = e.target.closest(TRIGGERS);
  if (toggle) openVideoOverlay(toggle);
});
