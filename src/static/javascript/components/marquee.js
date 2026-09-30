let responsiveGsap = gsap.matchMedia();

responsiveGsap.add(
  {
    maxSm: "(max-width: 480px)",
    maxMd: "(max-width: 768px)",
    minMd: "(min-width: 769px)",
    reduceMotion: "(prefers-reduced-motion: reduce)",
  },
  (context) => {
    let { maxSm, maxMd, reduceMotion } = context.conditions;
    if (reduceMotion) return;

    gsap.utils.toArray(".marquee").forEach((marqueeBlock) => {
      const marqueeInners = marqueeBlock.querySelectorAll(".marquee-inner");
      const velocity = parseFloat(marqueeBlock.getAttribute("data-marquee-velocity"));
      const speedDefault = parseFloat(marqueeBlock.getAttribute("data-marquee-speed"));
      const speedMd = parseFloat(marqueeBlock.getAttribute("data-marquee-speed-md"));
      const speedSm = parseFloat(marqueeBlock.getAttribute("data-marquee-speed-sm"));
      const scrubEnabled = marqueeBlock.hasAttribute("data-marquee-scrub");

      const scrollAlternate = marqueeBlock.hasAttribute("data-marquee-scroll-alternate");

      let marqueeSpeed = maxSm ? speedSm : maxMd ? speedMd : speedDefault;

      if (scrubEnabled) {
        // Scrub disables marquee animation, ties x directly to scroll
        marqueeInners.forEach((inner, index) => {
          gsap.fromTo(
            inner,
            { x: index % 2 === 0 ? "0%" : `-${velocity}%` },
            {
              x: index % 2 === 0 ? `-${velocity}%` : "0%",
              scrollTrigger: {
                trigger: marqueeBlock,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
                invalidateOnRefresh: true,
              },
            }
          );
        });
      } else {
        const marqueeTweens = [];

        marqueeInners.forEach((inner, index) => {
          // Always baseline animation
          const tween = gsap
            .to(inner, {
              xPercent: -50,
              repeat: -1,
              duration: marqueeSpeed,
              ease: "linear",
            })
            .totalProgress(0.5)
            .timeScale(index % 2 === 0 ? 1 : -1);

          marqueeTweens.push(tween);

          // If velocity is set > 0, overlay velocity scrub
          if (velocity > 0) {
            gsap.fromTo(
              inner,
              { x: index % 2 === 0 ? "0%" : `-${velocity}%` },
              {
                x: index % 2 === 0 ? `-${velocity}%` : "0%",
                scrollTrigger: {
                  trigger: marqueeBlock,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1,
                  invalidateOnRefresh: true,
                },
              }
            );
          }
        });

        const setPaused = (isActive) => marqueeTweens.forEach((tween) => tween.paused(!isActive));

        const visibility = ScrollTrigger.create({
          trigger: marqueeBlock,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => setPaused(self.isActive),
        });
        setPaused(visibility.isActive);

        // Scroll direction swap
        if (scrollAlternate) {
          let lastDirection = 1;

          ScrollTrigger.create({
            trigger: marqueeBlock,
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
              if (self.direction === lastDirection) return;
              lastDirection = self.direction;
              const isScrollingDown = self.direction === 1;

              marqueeTweens.forEach((tween, index) =>
                gsap.to(tween, {
                  timeScale: (index % 2 === 0) === isScrollingDown ? 1 : -1,
                  duration: 0.3,
                  ease: "power2.out",
                  overwrite: true,
                })
              );

              marqueeBlock.classList.toggle("marquee--alternated", !isScrollingDown);
            },
          });
        }
      }
    });
  }
);
