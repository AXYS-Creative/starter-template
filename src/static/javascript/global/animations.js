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

  const createMarkers = (color, indent) => ({
    startColor: color,
    endColor: color,
    fontSize: "12px",
    indent: indent,
    fontWeight: 500,
  });

  let whiteMarkers = createMarkers("white", 20);
  let blackMarkers = createMarkers("black", 20);
  let coralMarkers = createMarkers("coral", 120);
  let navyMarkers = createMarkers("navy", 220);

  responsiveGsap.add(
    {
      maxSm: "(max-width: 480px)",
      maxMd: "(max-width: 768px)",
      maxLg: "(max-width: 1024px)",
      minMd: "(min-width: 769px)",
    },
    (context) => {
      let { maxSm, maxMd, maxLg, minMd } = context.conditions;

      let bodyPadding = getComputedStyle(
        document.documentElement
      ).getPropertyValue("--body-padding");

      // Utility
      // Shuffle an array in place (used for grid-fade)
      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
      }

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
        // Page specific scrollTrigger fix
        if (document.querySelector(".main-library")) {
          window.addEventListener("load", () => {
            setTimeout(() => {
              ScrollTrigger.refresh();
            }, 500); // try 200–500ms if needed
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
            const playOnce = playOnceAttr === "true"; // Default behavior — Change to playOnceAttr !== "false" to swap the behavior

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
            const width = el.scrollWidth;
            el.style.width = `${width}px`;
            el.style.display = "inline-block";

            const runGlitch = () => {
              el.textContent = originalText;

              gsap.to(el, {
                scrambleText: {
                  text: originalText,
                  chars: "upperAndLowerCase",
                },
                duration: 1,
                revealDelay: 0.125,
              });
            };

            el.addEventListener("mouseenter", runGlitch);
            el.addEventListener("focus", runGlitch);
          });

          // Sibling glitch, uses 'glitch-trigger' and 'glitch-target__arbitrary' — 'glitch-trigger' needs data-glitch-target attribute with the unique target class
          document.querySelectorAll(".glitch-trigger").forEach((trigger) => {
            const targetClass = trigger.dataset.glitchTarget;
            if (!targetClass) return;

            // Scope to the nearest ancestor that contains both trigger and target
            const scope =
              trigger.closest(`[class*="glitch"]`) || trigger.parentElement;

            // Search *within that scope* for the target class
            const target = scope.querySelector(`.${targetClass}`);
            if (!target) return;

            // Store original text only once
            if (!target.dataset.originalText) {
              const originalText = target.textContent;
              target.dataset.originalText = originalText;
              const width = target.scrollWidth;
              target.style.width = `${width}px`;
              target.style.display = "inline-block";
            }

            const runGlitch = () => {
              const originalText = target.dataset.originalText;

              target.textContent = originalText;

              gsap.to(target, {
                scrambleText: {
                  text: originalText,
                  chars: "upperAndLowerCase",
                },
                duration: 1,
                revealDelay: 0.125,
              });
            };

            trigger.addEventListener("mouseenter", runGlitch);
            trigger.addEventListener("focus", runGlitch);
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

        // Grid Fade (Utility)
        {
          const gridFades = document.querySelectorAll(".grid-fade");

          if (gridFades.length) {
            gridFades.forEach((section) => {
              const scrubVal = 0.5;
              const fadeType = section.dataset.gridFade || "in";
              const tileSize = section.dataset.gridTileSize || "medium";
              const tileFadeRandom = section.dataset.gridFadeRandom || "true";

              // Determine config based on tileSize (default medium)
              let tileCount = 40;
              let minWidth = "12%";

              if (tileSize === "large") {
                tileCount = 20;
                minWidth = "18%";
              } else if (tileSize === "small") {
                tileCount = 192;
                minWidth = "6%";
              }

              const overlay = document.createElement("div");
              overlay.classList.add("grid-fade__overlay");

              const tiles = [];
              for (let i = 0; i < tileCount; i++) {
                const tile = document.createElement("div");
                tile.classList.add("grid-fade__overlay--tile");
                tile.style.minWidth = minWidth;
                overlay.appendChild(tile);
                tiles.push(tile);
              }

              section.appendChild(overlay);

              if (tileFadeRandom === "true") {
                shuffleArray(tiles);
              }

              if (fadeType === "in") {
                gsap.fromTo(
                  tiles,
                  { opacity: 1 },
                  {
                    opacity: 0,
                    ease: "none",
                    stagger: 1,
                    scrollTrigger: {
                      trigger: section,
                      start: "top 70%",
                      end: "top 15%",
                      scrub: scrubVal,
                    },
                  }
                );
              } else if (fadeType === "in-out") {
                const tl = gsap.timeline({
                  scrollTrigger: {
                    trigger: section,
                    start: "top 60%",
                    end: "bottom 20%",
                    scrub: scrubVal,
                  },
                });

                tl.to(tiles, {
                  opacity: 0,
                  ease: "none",
                  stagger: 1,
                })
                  .to(tiles, {
                    opacity: 0,
                    ease: "none",
                    stagger: 1,
                  })
                  .to(tiles, {
                    opacity: 1,
                    ease: "none",
                    stagger: 1,
                  });
              }
            });
          }
        }

        // Horizontal Scroll (pinned section)
        {
          const horizontalScroll =
            document.querySelectorAll(".horizontal-scroll");

          let horizontalScrub = maxSm ? 1 : 0.5;

          horizontalScroll.forEach((el) => {
            let container = el.querySelector(".horizontal-scroll__container");
            let slider = el.querySelector(".horizontal-scroll__slider");
            let imgs = el.querySelectorAll(
              ".horizontal-scroll__figure--parallax img"
            );
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
                  scrub: horizontalScrub,
                },
              }
            );

            // Optional parallax effect on images (use landscape images in portrait view)
            imgs.forEach((img) => {
              gsap.fromTo(
                img,
                { x: 0 },
                {
                  x: "25%", // Adjust this value for more or less parallax effect
                  ease: "none",
                  scrollTrigger: {
                    trigger: el,
                    start: "top top",
                    end: duration,
                    scrub: horizontalScrub,
                  },
                }
              );
            });
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

        // Stack Scroll (Overlapping Panels) — Duration and Delays can be controls via pin-steps in _stack-scroll.scss
        {
          const stackScrollSections =
            document.querySelectorAll(".stack-scroll");

          let panelToTop = "128px"; // Match with $panel-to-top in _stack-scroll.scss
          let panelScrub = 0.5;

          stackScrollSections.forEach((section) => {
            const panels = section.querySelectorAll(".stack-panel");
            const pinContainer = section.querySelector(".stack-pin");
            const pinSteps = section.querySelectorAll(".stack-pin-step");

            const duration = `${panels.length * 100}%`;

            // Pin the entire panel container
            gsap.to(pinContainer, {
              scrollTrigger: {
                trigger: pinContainer,
                start: `top ${bodyPadding}`,
                end: duration,
                pin: true,
              },
            });

            // Slide and scale panels
            panels.forEach((panel, i) => {
              const panelIndex = i + 1;
              const nextPanel = panels[i + 1];
              const triggerStep = section.querySelector(
                `.stack-pin-step-${panelIndex + 1}`
              );

              if (!triggerStep || !nextPanel) return;

              // Scale panels
              gsap.fromTo(
                `.stack-panel-${panelIndex}`,
                { scale: 1 },
                {
                  scale: 0.95,
                  ease: "none",
                  scrollTrigger: {
                    trigger: triggerStep,
                    start: "top 112%",
                    end: "bottom 112%",
                    scrub: panelScrub,
                  },
                }
              );

              // Slide in next panel
              gsap.fromTo(
                `.stack-panel-${panelIndex + 1}`,
                {
                  top: "120%",
                  // transform:
                  //   "perspective(1200px) rotateX(-50deg) translate(-50%, 0%)",
                },
                {
                  top: panelToTop,
                  // transform:
                  //   "perspective(1200px) rotateX(0deg) translate(-50%, 0%)",
                  ease: "none",
                  scrollTrigger: {
                    trigger: triggerStep,
                    start: "top 112%",
                    end: "bottom 112%",
                    scrub: panelScrub,
                  },
                }
              );
            });

            // Stack Link highlight
            if (document.querySelector(".stack-scroll__nav-link")) {
              const stackLinks = document.querySelectorAll(
                ".stack-scroll__nav-link"
              );

              pinSteps.forEach((marker, index) => {
                const link = stackLinks[index];

                ScrollTrigger.create({
                  trigger: marker,
                  start: "-15% top",
                  end: "85% top",
                  onEnter: () => link.classList.add("active"),
                  onEnterBack: () => link.classList.add("active"),
                  onLeave: () => link.classList.remove("active"),
                  onLeaveBack: () => link.classList.remove("active"),
                });
              });
            }
          });
        }

        // Video Scrub
        {
          const video = document.querySelector(".video-scrub");

          if (video) {
            video.addEventListener("loadedmetadata", () => {
              ScrollTrigger.create({
                trigger: ".video-scrub-section",
                start: "top top",
                end: "bottom top",
                scrub: true,
                pin: true,
                onUpdate: (self) => {
                  const progress = self.progress;
                  video.currentTime = video.duration * progress;
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
