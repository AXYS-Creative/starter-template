document.querySelectorAll(".parallax").forEach((el) => {
  const dataY = el.dataset.parallaxY || "15%";
  const dataScrub = parseFloat(el.dataset.parallaxScrub) || 1;
  const dataStart = el.dataset.parallaxStart || "top bottom";
  const dataEnd = el.dataset.parallaxEnd || "bottom top";

  gsap.to(el, {
    y: dataY,
    ease: "none",
    scrollTrigger: {
      trigger: el,
      start: dataStart,
      end: dataEnd,
      scrub: dataScrub,
    },
  });
});
