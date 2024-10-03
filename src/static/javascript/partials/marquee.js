let currentScroll = 0;

const initializeMarquee = (selector, duration) => {
  if (gsap) {
    return gsap.utils.toArray(selector).map((elem) =>
      gsap
        .to(elem, {
          xPercent: -50,
          repeat: -1,
          duration: duration,
          ease: "linear",
        })
        .totalProgress(0.5)
    );
  }
};

window.addEventListener("scroll", () => {
  const isScrollingDown = window.scrollY > currentScroll;

  const adjustTimeScale = (tweens) => {
    tweens.forEach((tween, index) =>
      gsap.to(tween, {
        timeScale: (index % 2 === 0) === isScrollingDown ? 1 : -1,
      })
    );
  };

  adjustTimeScale(marqueeTweens);

  currentScroll = window.scrollY;
});

const marqueeTweens = initializeMarquee(
  ".marquee-inner",
  window.innerWidth > 768 ? 16 : 10
);
