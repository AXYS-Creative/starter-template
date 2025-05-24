// Cubic Bézier easing function (for cross-browser compatible animations)
export const cubicBezier = (p1x, p1y, p2x, p2y) => {
  // Example: const ease = cubicBezier(0.09, 0.9, 0.5, 1);
  return function (t) {
    t = Math.max(0, Math.min(1, t));

    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    const x = 3 * mt2 * t * p1x + 3 * mt * t2 * p2x + t3;
    const y = 3 * mt2 * t * p1y + 3 * mt * t2 * p2y + t3;

    return y;
  };
};

// GSAP
{
  gsap.registerPlugin(ScrollTrigger);
  gsap.registerPlugin(ScrambleTextPlugin);

  let responsiveGsap = gsap.matchMedia();

  let whiteMarkers = {
    startColor: "white",
    endColor: "white",
    fontSize: "0.75rem",
    indent: 128,
    fontWeight: 400,
  };

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

      // GLOBAL (place under other tweens i.e. pinned sections) - Animate any element with the class 'gsap-animate' using the 'animate' companion class
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
          const parallaxConfigs = [
            { selector: ".parallax", y: "15%", scrub: 1 },
            { selector: ".parallax--strong", y: "25%", scrub: 1 },
            { selector: ".parallax--reverse", y: "-25%", scrub: 0.25 },
          ];

          parallaxConfigs.forEach(({ selector, y, scrub }) => {
            document.querySelectorAll(selector).forEach((el) => {
              gsap.to(el, {
                y,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub,
                },
              });
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

        // Marquee Animations
        {
          let marqueeSpeed = maxSm ? 20 : maxMd ? 24 : 28;

          // Standard Marquee
          {
            const autoMarquees = gsap.utils.toArray(".marquee-inner");
            let marqueeTweens = [];

            const createMarqueeTweens = () => {
              marqueeTweens.forEach((tween) => tween.kill()); // Kill previous tweens to prevent stacking memory
              marqueeTweens = [];

              autoMarquees.forEach((elem) => {
                const tween = gsap
                  .to(elem, {
                    xPercent: -50,
                    repeat: -1,
                    duration: marqueeSpeed,
                    ease: "linear",
                  })
                  .totalProgress(0.5);

                marqueeTweens.push(tween);
              });
            };

            createMarqueeTweens();

            let currentScroll = window.scrollY;

            const adjustTimeScale = () => {
              const isScrollingDown = window.scrollY > currentScroll;

              marqueeTweens.forEach((tween, index) =>
                gsap.to(tween, {
                  timeScale: (index % 2 === 0) === isScrollingDown ? 1 : -1,
                  duration: 0.3,
                  ease: "power2.out",
                })
              );

              currentScroll = window.scrollY;
            };

            window.addEventListener("scroll", adjustTimeScale, {
              passive: true,
            });
          }

          // Scrub Effect for Specific Marquees
          {
            const scrubMarquees = gsap.utils.toArray(".marquee--scrub");
            const sensitivity = 5;
            let scrubTriggers = [];

            const createScrubMarquees = () => {
              scrubTriggers.forEach((trigger) => trigger.kill());
              scrubTriggers = [];

              scrubMarquees.forEach((scrubElem) => {
                const marqueeInners =
                  scrubElem.querySelectorAll(".marquee-inner");

                marqueeInners.forEach((inner, index) => {
                  const scrubTween = gsap.fromTo(
                    inner,
                    { x: index % 2 === 0 ? "0%" : `-${sensitivity}%` },
                    {
                      x: index % 2 === 0 ? `-${sensitivity}%` : "0%",
                      scrollTrigger: {
                        trigger: scrubElem,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 1,
                        invalidateOnRefresh: true,
                      },
                    }
                  );

                  scrubTriggers.push(scrubTween.scrollTrigger);
                });
              });
            };

            createScrubMarquees();
          }
        }

        // Glitch Text (Uses gsap scrambleText)
        {
          let alphaNumberic = "0123456789abcedfghijklmnopqrstuvwxyz";

          // Scroll-based glitch
          document.querySelectorAll(".glitch-scroll").forEach((el) => {
            const originalText = el.textContent;
            const chars = el.dataset.glitchChars || "upperAndLowerCase";
            const revealDelay =
              parseFloat(el.dataset.glitchRevealDelay) || 0.05; // Ensure revealDelay is less than the duration
            const duration = parseFloat(el.dataset.glitchDuration) || 0.75;
            const playOnceAttr = el.dataset.glitchOnce;
            const playOnce = playOnceAttr !== "false"; // Default to true unless explicitly set to "false"

            if (playOnce) {
              // 🔁 Play once using scrollTrigger animation timeline
              gsap
                .timeline({
                  scrollTrigger: {
                    trigger: el,
                    start: "top 98%",
                    once: true,
                  },
                })
                .to(el, {
                  scrambleText: {
                    text: originalText,
                    chars,
                    revealDelay,
                  },
                  duration,
                });
            } else {
              // 🔁 Play every time
              gsap.to(el, {
                scrollTrigger: {
                  trigger: el,
                  start: "top 98%",
                  toggleActions: "play reset play reset",
                  onEnter: () => animateScramble(),
                  onEnterBack: () => animateScramble(),
                },
              });

              function animateScramble() {
                el.textContent = originalText;

                gsap.to(el, {
                  scrambleText: {
                    text: originalText,
                    chars,
                    revealDelay,
                  },
                  duration,
                });
              }
            }
          });

          // Hover-based glitch
          document.querySelectorAll(".glitch-hover").forEach((el) => {
            const originalText = el.textContent;
            // Lock width to prevent layout shift
            const width = el.offsetWidth;
            el.style.width = `${width + 2}px`;
            // el.style.display = "inline-block";

            el.addEventListener("mouseenter", () => {
              el.textContent = originalText;

              gsap.to(el, {
                scrambleText: {
                  text: originalText,
                  chars: "upperAndLowerCase",
                },
                duration: 1,
                revealDelay: 0.125,
              });
            });
          });

          // Sibling glitch, uses 'glitch-trigger' and 'glitch-target__arbitrary' — 'glitch-trigger' needs data-glitch-target attribute with the unique target class
          document.querySelectorAll(".glitch-trigger").forEach((trigger) => {
            const targetClass = trigger.dataset.glitchTarget;
            if (!targetClass) return;

            const target = document.querySelector(`.${targetClass}`);
            if (!target) return;

            const originalText = target.textContent;
            target.dataset.originalText = originalText;

            // Lock width once
            const width = target.scrollWidth;
            target.style.width = `${width}px`;
            target.style.display = "inline-block";

            trigger.addEventListener("mouseenter", () => {
              target.textContent = originalText;

              gsap.to(target, {
                scrambleText: {
                  text: originalText,
                  chars: "upperAndLowerCase",
                },
                duration: 1,
                revealDelay: 0.125,
              });
            });
          });

          // Cycle-based glitch
          document.querySelectorAll(".glitch-cycle").forEach((el) => {
            const words =
              el.dataset.glitchCycleWords?.split(",").map((w) => w.trim()) ||
              [];
            const colorValues = el.dataset.glitchCycleColors
              ?.split(",")
              .map((c) => c.trim());
            const hasColors =
              Array.isArray(colorValues) && colorValues.length > 0;

            let index = 0;
            const glitchCycleInterval =
              parseInt(el.dataset.glitchCycleInterval) || 2000;

            if (words.length === 0) return;

            const cycle = () => {
              const color = hasColors
                ? colorValues[index % colorValues.length]
                : null;

              gsap.to(el, {
                scrambleText: {
                  text: words[index],
                  chars: alphaNumberic,
                  duration: 1.25,
                  revealDelay: 0.125,
                },
                color: color,
                duration: 0.5,
                onComplete: () => {
                  index = (index + 1) % words.length;
                  setTimeout(cycle, glitchCycleInterval);
                },
              });
            };

            cycle();
          });
        }

        // Video Scrub
        {
          const video = document.querySelector(".video-scrub");

          if (video) {
            // Wait for metadata to get duration
            video.addEventListener("loadedmetadata", () => {
              const duration = video.duration;

              gsap.registerPlugin(ScrollTrigger);

              gsap.to(video, {
                currentTime: duration,
                ease: "none",
                scrollTrigger: {
                  trigger: ".video-scrub-section",
                  start: "top top",
                  end: "bottom top",
                  scrub: true,
                  pin: true,
                  anticipatePin: 1,
                  // markers: true,
                },
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

  // Fix scrollTrigger issue with loading="lazy" (alternate approach loading="eager")
  {
    function handleLazyLoad(config = {}) {
      let lazyImages = gsap.utils.toArray("img[loading='lazy']"),
        timeout = gsap
          .delayedCall(config.timeout || 1, ScrollTrigger.refresh)
          .pause(),
        lazyMode = config.lazy !== false,
        imgLoaded = lazyImages.length,
        onImgLoad = () =>
          lazyMode
            ? timeout.restart(true)
            : --imgLoaded || ScrollTrigger.refresh();
      lazyImages.forEach((img, i) => {
        lazyMode || (img.loading = "eager");
        img.naturalWidth
          ? onImgLoad()
          : img.addEventListener("load", onImgLoad);
      });
    }

    // Timeout is how many seconds it throttles the loading events that call ScrollTrigger.refresh()
    handleLazyLoad({ lazy: false, timeout: 1 });
  }
}
