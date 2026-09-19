// Video Player (see components/video-player.njk)
// Mirrors the video's state onto `data-playing` so CSS can show the custom
// play button whenever it isn't playing. Listens to the video's own events
// rather than the button's click, so the native controls, keyboard and the
// ended state all stay in sync.
document.querySelectorAll("[data-video-player]").forEach((player) => {
  const video = player.querySelector("video");
  const playBtn = player.querySelector(".video-player__play");
  if (!video || !playBtn) return;

  const sync = () => {
    const playing = !video.paused && !video.ended;
    player.dataset.playing = String(playing);
  };

  ["play", "playing", "pause", "ended", "emptied"].forEach((event) =>
    video.addEventListener(event, sync),
  );

  playBtn.addEventListener("click", () => {
    video.play().catch(() => {}); // e.g. blocked or interrupted by a src change
    video.focus(); // hand keyboard users straight to the native controls
  });

  sync();
});
