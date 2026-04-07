document.querySelectorAll(".parallax").forEach((el) => {
  const dataYFrom = el.dataset.parallaxYFrom || "-5%";
  const dataYTo = el.dataset.parallaxYTo || "5%";
  const dataScrub = parseFloat(el.dataset.parallaxScrub) || 1;
  const dataStart = el.dataset.parallaxStart || "top bottom";
  const dataEnd = el.dataset.parallaxEnd || "bottom top";

  gsap.fromTo(
    el,
    {
      y: dataYFrom,
    },
    {
      y: dataYTo,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: dataStart,
        end: dataEnd,
        scrub: dataScrub,
      },
    },
  );
});
