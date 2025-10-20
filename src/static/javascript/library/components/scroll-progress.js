const scrollProgress = document.querySelector(".scroll-progress"),
  progressBar = document.querySelector(".scroll-progress__bar");

if (scrollProgress && progressBar) {
  const typeVal = scrollProgress.dataset.scrollProgressType || "width";
  const allowsClick = scrollProgress.classList.contains(
    "scroll-progress--allow-click"
  );

  const updateScrollbar = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;

    if (typeVal === "width") {
      progressBar.style.width = `${scrollPercent}%`;
    } else {
      progressBar.style.height = `${scrollPercent}%`;
    }
  };

  // Scroll to the clicked position
  if (allowsClick) {
    const handleClick = (e) => {
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      let clickPercent;

      if (typeVal === "width") {
        const clickX = e.offsetX; // click position within element
        const barWidth = scrollProgress.offsetWidth;
        clickPercent = clickX / barWidth;
      } else {
        const clickY = e.offsetY;
        const barHeight = scrollProgress.offsetHeight;
        clickPercent = clickY / barHeight;
      }

      const scrollTarget = docHeight * clickPercent;
      window.scrollTo({ top: scrollTarget, behavior: "smooth" });
    };

    scrollProgress.addEventListener("click", handleClick);
  }

  // Bind listeners
  window.addEventListener("scroll", updateScrollbar);
  window.addEventListener("resize", updateScrollbar);

  // Initialize
  updateScrollbar();
}
