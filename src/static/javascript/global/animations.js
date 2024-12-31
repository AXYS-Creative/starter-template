gsap.registerPlugin(ScrollTrigger);

let responsiveGsap = gsap.matchMedia();

responsiveGsap.add(
  {
    maxSm: "(max-width: 480px)",
    maxMd: "(max-width: 768px)",
    maxXl: "(max-width: 1200px)",
    minMd: "(min-width: 769px)",
  },
  (context) => {
    let { maxSm, maxMd, maxXl, minMd } = context.conditions;

    // // TEMPLATE TWEEN - SCRUB
    // gsap.fromTo(
    //   ".slider__inner",
    //   { x: "-2%" },
    //   {
    //     x: maxSm ? "-32%" : maxXl ? "-32%" : "-32%",
    //     scrollTrigger: {
    //       trigger: ".slider",
    //       start: "top bottom",
    //       end: maxSm ? "bottom 75%" : "bottom top",
    //       scrub: 0.8,
    //       // markers: true,
    //     },
    //   }
    // );

    // GLOBAL - Easily toggle an 'animate' class on any element with '.gsap-animate' class
    const globalGenerateAnimate = (() => {
      const targetElements = document.querySelectorAll(".gsap-animate");

      targetElements.forEach((targetElem) => {
        gsap.to(targetElem, {
          scrollTrigger: {
            trigger: targetElem,
            start: "top 98%",
            end: "bottom top",
            onEnter: () => targetElem.classList.add("animate"),
            onLeave: () => targetElem.classList.remove("animate"),
            onEnterBack: () => targetElem.classList.add("animate"),
            onLeaveBack: () => targetElem.classList.remove("animate"),
          },
        });
      });
    })();

    // Marquee
    {
      let marqueeSpeed = maxSm ? 20 : maxMd ? 18 : 16;
      const marqueeTweens = gsap.utils.toArray(".marquee-inner").map((elem) =>
        gsap
          .to(elem, {
            xPercent: -50,
            repeat: -1,
            duration: marqueeSpeed,
            ease: "linear",
          })
          .totalProgress(0.5)
      );

      let currentScroll = 0;
      const adjustTimeScale = () => {
        const isScrollingDown = window.scrollY > currentScroll;
        marqueeTweens.forEach((tween, index) =>
          gsap.to(tween, {
            timeScale: (index % 2 === 0) === isScrollingDown ? 1 : -1,
          })
        );
        currentScroll = window.scrollY;
      };

      window.addEventListener("scroll", adjustTimeScale);

      return () => {
        marqueeTweens.forEach((tween) => tween.kill());
        window.removeEventListener("scroll", adjustTimeScale);
      };
    }
  }
);

// Refresh ScrollTrigger instances on page load and resize
window.addEventListener("load", () => {
  ScrollTrigger.refresh();
});

// Greater than 520 so it doesn't refresh on  mobile(dvh)
if (window.innerWidth > 520) {
  window.addEventListener("resize", () => {
    ScrollTrigger.refresh();
  });
}
