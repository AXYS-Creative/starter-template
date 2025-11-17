const allVideoBg = document.querySelectorAll(".video-bg");

allVideoBg.forEach((container) => {
  const video = container.querySelector(".video-bg__video");
  const btnToggle = container.querySelector(".video-bg__toggle");

  if (!video || !btnToggle) return;

  const originalSrc = video.getAttribute("src");
  if (originalSrc && originalSrc.includes("dl=0")) {
    video.setAttribute("src", originalSrc.replace("dl=0", "raw=1")); // Ensure Dropbox links work as raw video
  }

  // Helper to update button state
  const updateButtonState = () => {
    btnToggle.setAttribute(
      "aria-label",
      `${video.paused ? "Play" : "Pause"} background video`
    );
  };

  updateButtonState(); // Initialize button state (in case video is autoplaying)

  btnToggle.addEventListener("click", () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    updateButtonState();
  });

  // Sync button state if user interacts with native controls (edge cases)
  video.addEventListener("play", updateButtonState);
  video.addEventListener("pause", updateButtonState);
});
