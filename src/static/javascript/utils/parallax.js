document.querySelectorAll(".parallax").forEach((el) => {
  const dataYFrom = el.dataset.parallaxFrom || "-5%";
  const dataYTo = el.dataset.parallaxTo || "5%";
  const dataScrub = parseFloat(el.dataset.parallaxScrub) || 1;
  const dataStart = el.dataset.parallaxStart || "top bottom";
  const dataEnd = el.dataset.parallaxEnd || "bottom top";
  const dataMarkers = el.dataset.parallaxMarkers === "true";

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
        markers: dataMarkers,
      },
    },
  );
});
