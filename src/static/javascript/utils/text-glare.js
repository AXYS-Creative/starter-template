let trackMouseSelectors = ["[data-track-mouse]", "[data-flashlight]"];
document.querySelectorAll([...trackMouseSelectors]).forEach((el) => {
  // Switch to document if tracking the whole window
  // el.addEventListener("mousemove", (e) => {
  document.addEventListener("mousemove", (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    el.style.setProperty("--gradient-pos", `${xPercent}% ${yPercent}%`);
  });
});
