gsap.registerPlugin(ScrollTrigger);

let responsiveGsap = gsap.matchMedia();

responsiveGsap.add(
  {
    maxSm: "(max-width: 480px)",
    maxMd: "(max-width: 768px)",
    maxLg: "(max-width: 1024px)",
    minMd: "(min-width: 769px)",
  },
  (context) => {
    let { maxSm, maxMd, maxLg, minMd } = context.conditions;

    // // TEMPLATE TWEEN - SCRUB
    // gsap.fromTo(
    //   ".slider__inner",
    //   { x: "-2%" },
    //   {
    //     x: maxSm ? "-32%" : maxLg ? "-32%" : "-32%",
    //     scrollTrigger: {
    //       trigger: ".slider",
    //       start: "top bottom",
    //       end: maxSm ? "bottom 75%" : "bottom top",
    //       scrub: 0.8,
    //       // markers: true,
    //     },
    //   }
    // );

    // GLOBAL - Animate any element with the class 'gsap-animate' using the 'animate' companion class
    {
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
    }

    // Library - Lift any desired code blocks out, then delete from production
    {
      // Parallax
      {
        const parallax = document.querySelectorAll(".parallax");

        parallax.forEach((el) => {
          gsap.to(el, {
            y: "15%",
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          });
        });
      }

      // Fill Text - Scrub only
      {
        // Use 'fill-text' for default, then 'quick-fill' or 'slow-fill' to modify animation end
        const fillText = document.querySelectorAll(".fill-text");

        if (fillText) {
          fillText.forEach((el) => {
            let end = "bottom 60%";

            // Modifier classes –— Higher percentage ends the animation faster
            if (el.classList.contains("quick-fill")) {
              end = "bottom 80%";
            } else if (el.classList.contains("slow-fill")) {
              end = "bottom 40%";
            }

            gsap.fromTo(
              el,
              {
                backgroundSize: "0%",
              },
              {
                backgroundSize: "100%",
                scrollTrigger: {
                  trigger: el,
                  start: "top 90%",
                  end: end,
                  scrub: 1,
                },
              }
            );
          });
        }
      }

      // Horizontal Scroll (pinned section)
      {
        const horizontalScroll =
          document.querySelectorAll(".horizontal-scroll");

        horizontalScroll.forEach((el) => {
          let container = el.querySelector(".container");
          let slider = el.querySelector(".slider");
          const sliderWidth = slider.scrollWidth;
          const containerWidth = container.offsetWidth;
          const distanceToTranslate = sliderWidth - containerWidth;

          let duration = maxSm ? "+=150%" : "+=200%";

          // Actual Pinning
          gsap.to(el, {
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: duration,
              pin: true,
            },
          });

          // Slider Along X-Axis
          gsap.fromTo(
            slider,
            { x: 0 },
            {
              x: () => -distanceToTranslate,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top top",
                end: duration,
                scrub: maxSm ? 1 : 0.5,
              },
            }
          );
        });
      }

      // Marquee animations
      {
        let marqueeSpeed = maxSm ? 20 : maxMd ? 24 : 28;

        // Standard
        {
          const autoMarquees = gsap.utils.toArray(".marquee-inner");

          const marqueeTweens = autoMarquees.map((elem) =>
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
        }

        // Scrub, use 'marquee_scrub' boolean prop
        {
          const scrubMarquees = gsap.utils.toArray(".marquee--scrub");
          let sensitivity = 5;

          scrubMarquees.forEach((scrubElem) => {
            const marqueeInners = scrubElem.querySelectorAll(".marquee-inner");

            marqueeInners.forEach((inner, index) => {
              gsap.fromTo(
                inner,
                {
                  x: index % 2 === 0 ? "0%" : `-${sensitivity}%`,
                },
                {
                  x: index % 2 === 0 ? `-${sensitivity}%` : "0%",
                  scrollTrigger: {
                    trigger: scrubElem,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                  },
                }
              );
            });
          });
        }
      }
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
