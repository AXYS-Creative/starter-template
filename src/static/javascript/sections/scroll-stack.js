let responsiveGsap = gsap.matchMedia();

responsiveGsap.add(
  {
    maxSm: "(max-width: 480px)",
    maxMd: "(max-width: 768px)",
    minMd: "(min-width: 769px)",
  },
  (context) => {
    let { maxSm } = context.conditions;

    let bodyPadding = getComputedStyle(document.documentElement).getPropertyValue("--body-padding");

    // Scroll Stack (Overlapping Panels) — Duration and Delays can be controls via pin-steps in _scroll-stack.scss
    {
      const scrollStackSections = document.querySelectorAll(".scroll-stack");

      let panelToTop = maxSm ? "96px" : "200px"; // Match with $panel-to-top in _scroll-stack.scss
      let panelScrub = 0.5;

      scrollStackSections.forEach((section) => {
        const panels = section.querySelectorAll(".scroll-stack__panel");
        const pinContainer = section.querySelector(".scroll-stack__pin");
        const pinSteps = section.querySelectorAll(".scroll-stack__pin-step");

        const stackDuration = `${panels.length * 80}%`;

        // Pin the entire panel container
        gsap.to(pinContainer, {
          scrollTrigger: {
            trigger: pinContainer,
            start: `top ${bodyPadding}`,
            end: stackDuration,
            pin: true,
          },
        });

        // Slide and scale panels
        panels.forEach((panel, i) => {
          const panelIndex = i + 1;
          const nextPanel = panels[i + 1];
          const triggerStep = section.querySelector(`.scroll-stack__pin-step-${panelIndex + 1}`);

          if (!triggerStep || !nextPanel) return;

          let startPoint = "top 112%";
          let endPoint = "bottom 112%";

          // Scale panels
          gsap.fromTo(
            `.scroll-stack__panel-${panelIndex}`,
            { scale: 1 },
            {
              scale: 0.94,
              ease: "none",
              scrollTrigger: {
                trigger: triggerStep,
                start: startPoint,
                end: endPoint,
                scrub: panelScrub,
              },
            }
          );

          // Slide in panels
          gsap.fromTo(
            `.scroll-stack__panel-${panelIndex + 1}`,
            {
              top: "120%",
            },
            {
              top: panelToTop,
              ease: "none",
              scrollTrigger: {
                trigger: triggerStep,
                start: startPoint,
                end: endPoint,
                scrub: panelScrub,
              },
            }
          );
        });

        // Link highlight
        if (document.querySelector(".scroll-stack__nav-link")) {
          const stackLinks = document.querySelectorAll(".scroll-stack__nav-link");

          pinSteps.forEach((marker, index) => {
            const link = stackLinks[index];

            ScrollTrigger.create({
              trigger: marker,
              start: "-30% top",
              end: "50% top",
              onEnter: () => link.classList.add("active"),
              onEnterBack: () => link.classList.add("active"),
              onLeave: () => link.classList.remove("active"),
              onLeaveBack: () => link.classList.remove("active"),
            });
          });
        }
      });
    }
  }
);
