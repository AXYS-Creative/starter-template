import { root, globalConfig, mqNoMotion, mqMouse } from "../util.js";
import { headerHeight } from "../global/header.js";

//
// Adjust animation delays based on global loader.js
//
const getLoadState = () => ({
  isLoading: document.body.hasAttribute("data-body-loading"),
  isLoadComplete: document.body.hasAttribute("data-body-loading-complete"),
});

const isLoading = getLoadState().isLoading;

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
  gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, CustomEase);

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

  // gsap ease converter
  function cubicToCustomEase(name, bezierString) {
    // Example input: "cubic-bezier(0.75, 0, 0.2, 1)"
    const match = bezierString.match(/cubic-bezier\(([^)]+)\)/);
    if (!match) {
      console.warn(`Invalid cubic-bezier format: ${bezierString}`);
      return "power1.out";
    }

    const [x1, y1, x2, y2] = match[1].split(",").map((v) => parseFloat(v.trim()));
    const path = `M0,0 C${x1},${y1} ${x2},${y2} 1,1`;

    return CustomEase.create(name, path);
  }

  // Convert any ease from _variables.scss
  cubicToCustomEase("easeSudden", "cubic-bezier(0.75, 0, 0.2, 1)");

  responsiveGsap.add(
    {
      maxSm: "(max-width: 480px)",
      maxMd: "(max-width: 768px)",
      maxLg: "(max-width: 1024px)",
      minMd: "(min-width: 769px)",
    },
    (context) => {
      let { maxSm, maxMd, maxLg, minMd } = context.conditions;

      let bodyPadding = getComputedStyle(document.documentElement).getPropertyValue(
        "--body-padding"
      );

      // Utility
      // Shuffle an array in place (used for grid-fade)
      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
      }
      // Track loader state
      let loaderHasCompleted = false;

      window.addEventListener("loader:complete", () => {
        loaderHasCompleted = true;
      });

      // Library - Lift any desired code blocks out, then delete from production
      {
        // Page specific scrollTrigger fix (delay refresh)
        if (document.querySelector(".main-library")) {
          window.addEventListener("load", () => {
            setTimeout(() => {
              ScrollTrigger.refresh();
            }, 500); // try 200–500ms if needed
          });
        }

        // Counter component (Default values are declared in .njk component)
        {
          const counters = document.querySelectorAll(".counter");

          counters.forEach((el) => {
            const valueWrapper = el.querySelector(".counter__value");
            const digitEl = el.querySelector(".counter__value-digit"); // stable hook

            const prefixText = el.querySelector(".counter__value-prefix")?.textContent ?? "";
            const suffixText = el.querySelector(".counter__value-suffix")?.textContent ?? "";
            const endValue = parseFloat(el.dataset.counterNumber);
            const duration = Math.max(0, parseInt(el.dataset.counterDuration, 10) || 0) / 1000;
            const runOnce = el.dataset.counterOnce === "true";
            const comma = el.dataset.counterComma === "true";
            const ticker = digitEl.classList.contains("counter__value-digit--ticker");

            if (isNaN(endValue) || !digitEl) return;

            const isWholeNumber = Number.isInteger(endValue);
            const snapValue = isWholeNumber ? 1 : 0.1;

            const formatValue = (num) => {
              if (comma) {
                return num.toLocaleString(undefined, {
                  minimumFractionDigits: isWholeNumber ? 0 : 1,
                  maximumFractionDigits: isWholeNumber ? 0 : 1,
                });
              } else {
                return isWholeNumber ? Math.round(num).toString() : num.toFixed(1);
              }
            };

            const finalFormatted = formatValue(endValue);
            const estimatedText = `${prefixText}${finalFormatted}${suffixText}`;
            valueWrapper.style.width = `${estimatedText.length}ch`;

            let hasPlayed = false;

            // Numeric mode (unchanged)
            if (!ticker) {
              const obj = { val: 0 };
              const tween = gsap.to(obj, {
                val: endValue,
                duration,
                ease: "power1.out",
                snap: { val: snapValue },
                paused: true,
                onUpdate: () => (digitEl.textContent = formatValue(obj.val)),
              });

              if (mqNoMotion) {
                ScrollTrigger.create({
                  trigger: el,
                  start: "top bottom",
                  once: true,
                  onEnter: () => (digitEl.textContent = finalFormatted),
                });
              } else {
                ScrollTrigger.create({
                  trigger: el,
                  start: "top bottom",
                  once: runOnce,
                  onEnter: () => {
                    if (!runOnce || !hasPlayed) {
                      tween.play();
                      hasPlayed = true;
                    }
                  },
                  onLeave: () => {
                    if (!runOnce) {
                      tween.pause(0);
                      digitEl.textContent = "0";
                    }
                  },
                  onEnterBack: () => {
                    if (!runOnce) tween.restart(0);
                  },
                  onLeaveBack: () => {
                    if (!runOnce) {
                      tween.pause(0);
                      digitEl.textContent = "0";
                      hasPlayed = false;
                    }
                  },
                });
              }
              return;
            }

            // Ticker mode (prebuild timeline at init)
            const wrapDigits = (targetStr) => {
              const parts = Array.from(targetStr).map((ch) =>
                /\d/.test(ch)
                  ? `<span class="digit" data-counter-value="${ch}">
               <span class="sequence">0<br>1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9</span>
             </span>`
                  : ch
              );
              digitEl.innerHTML = parts.join("");
              digitEl.setAttribute("data-wrapped", "true");
              digitEl.setAttribute("data-final-text", targetStr);
            };

            if (
              digitEl.getAttribute("data-wrapped") !== "true" ||
              digitEl.getAttribute("data-final-text") !== finalFormatted
            ) {
              digitEl.textContent = finalFormatted; // sizing
              wrapDigits(finalFormatted);
            }

            const sequences = digitEl.querySelectorAll(".sequence");
            // Guard against CSS transitions causing delay
            gsap.set(sequences, { yPercent: 0, willChange: "transform" });

            const tl = gsap.timeline({
              paused: true,
              defaults: { lazy: false },
            });

            digitEl.querySelectorAll(".digit").forEach((digit) => {
              const value = parseInt(digit.getAttribute("data-counter-value"), 10) || 0;
              tl.to(digit.querySelector(".sequence"), { yPercent: -(value * 10) }, 0);
            });

            // stash for callbacks
            el._tickerTl = tl;

            if (mqNoMotion) {
              ScrollTrigger.create({
                trigger: el,
                start: "top bottom",
                once: true,
                onEnter: () => tl.progress(1).pause(),
              });
            } else {
              ScrollTrigger.create({
                trigger: el,
                start: "top bottom",
                once: runOnce,
                invalidateOnRefresh: true,
                onEnter: () => {
                  if (!runOnce || !hasPlayed) {
                    tl.play(0);
                    hasPlayed = true;
                  }
                },
                onLeave: () => {
                  if (!runOnce) tl.progress(0).pause();
                },
                onEnterBack: () => {
                  if (!runOnce) tl.play(0);
                },
                onLeaveBack: () => {
                  if (!runOnce) {
                    tl.progress(0).pause();
                    hasPlayed = false;
                  }
                },
              });
            }
          });
        }

        // Glitch Text (Uses gsap scrambleText) TODO: Consider making shared configs across glitch effects, e.g. data-glitch-chars could be used for all instances.
        {
          let alphaNumberic = "0123456789abcedfghijklmnopqrstuvwxyz";
          // const glitchTextElems = document.querySelectorAll(".glitch-text");

          // glitchTextElems.forEach((el) => {
          //   setTimeout(() => {
          //     // Helps with preventing inline shifting (center aligned text)
          //     const width = el.offsetWidth;
          //     el.style.width = `${width}px`;
          //   }, 1000);
          // });

          // Scroll-based glitch
          document.querySelectorAll(".glitch-scroll").forEach((el) => {
            const originalText = el.textContent;
            const chars = el.dataset.glitchChars || "upperAndLowerCase";
            const revealDelay = parseFloat(el.dataset.glitchRevealDelay) || 0.05;
            const duration = parseFloat(el.dataset.glitchDuration) || 0.75;
            const playOnceAttr = el.dataset.glitchOnce;
            const playOnce = playOnceAttr === "true"; // Default is false (repeat), only true if explicitly set
            const glitchTrigger = el.dataset.glitchTrigger || el; // Requires . or #
            const glitchStart = el.dataset.glitchStart || "top 98%";
            const glitchEnd = el.dataset.glitchEnd || "bottom 2%"; // Only on "playOnce = false"
            const glitchMarkers = el.dataset.glitchMarkers === "true";

            if (playOnce) {
              // 🔁 Play once on scroll
              gsap
                .timeline({
                  scrollTrigger: {
                    trigger: glitchTrigger,
                    start: glitchStart,
                    once: true,
                    markers: glitchMarkers,
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
              // 🔁 Repeat on scroll in both directions
              const animateScramble = () => {
                el.textContent = originalText;

                gsap.to(el, {
                  scrambleText: {
                    text: originalText,
                    chars,
                    revealDelay,
                  },
                  duration,
                });
              };

              gsap.to(el, {
                scrollTrigger: {
                  trigger: glitchTrigger,
                  start: glitchStart,
                  end: glitchEnd,
                  onEnter: animateScramble,
                  onEnterBack: animateScramble,
                  markers: glitchMarkers,
                },
              });
            }
          });

          // Hover-based glitch
          document.querySelectorAll(".glitch-hover").forEach((el) => {
            // Decide what to glitch
            const target = el.querySelector(".btn__text") || el;

            const originalText = target.textContent;
            const newText = el.dataset.glitchNewText;
            const chars = el.dataset.glitchChars || "upperAndLowerCase";
            const duration = parseFloat(el.dataset.glitchDuration) || 0.5;
            const revealDelay = parseFloat(el.dataset.glitchRevealDelay) || 0.125;
            const glitchOut = el.dataset.glitchOut === "true"; // Default is false (hover in, hover out)

            // Prevent layout shift (measure width of target, not full button)
            if (!newText) {
              const width = target.scrollWidth;
              target.style.display = "inline-block";

              setTimeout(() => {
                target.style.width = `${width}px`;
              }, 1000);
            }

            const glitchTo = (text = originalText) => {
              target.textContent = text; // Reset to base before scrambling
              gsap.to(target, {
                scrambleText: {
                  text,
                  chars,
                  revealDelay,
                },
                duration,
              });
            };

            el.addEventListener("mouseenter", () => glitchTo(newText));
            el.addEventListener("focus", () => glitchTo(newText));

            if (glitchOut || newText) {
              el.addEventListener("mouseleave", () => glitchTo(originalText));
              el.addEventListener("blur", () => glitchTo(originalText));
            }
          });

          // Glitch Target, uses 'glitch-trigger' and 'glitch-target__arbitrary' — 'glitch-trigger' needs data-glitch-target attribute with the unique target class
          document.querySelectorAll(".glitch-trigger").forEach((trigger) => {
            const targetClass = trigger.dataset.glitchTarget;
            if (!targetClass) return;

            const wrapper = trigger.closest(".glitch-pair");
            const target = wrapper?.querySelector(`.${targetClass}`);
            if (!target) return;

            if (!target.dataset.originalText) {
              target.dataset.originalText = target.textContent;
              target.style.display = "inline-block";

              setTimeout(() => {
                target.style.width = `${target.scrollWidth}px`;
              }, 1000);
            }

            const runGlitch = () => {
              const originalText = target.dataset.originalText;

              target.textContent = originalText;

              gsap.to(target, {
                scrambleText: {
                  text: originalText,
                  chars: "upperAndLowerCase",
                },
                duration: 0.75,
                revealDelay: 0.125,
              });
            };

            trigger.addEventListener("mouseenter", runGlitch);
            trigger.addEventListener("focus", runGlitch);
          });

          // Cycle-based glitch
          document.querySelectorAll(".glitch-cycle").forEach((el) => {
            const words = el.dataset.glitchCycleWords?.split(",").map((w) => w.trim()) || [];
            const colorValues = el.dataset.glitchCycleColors?.split(",").map((c) => c.trim());
            const hasColors = Array.isArray(colorValues) && colorValues.length > 0;

            let index = 0;
            const glitchCycleInterval = parseInt(el.dataset.glitchCycleInterval) || 2000;

            if (words.length === 0) return;

            const cycle = () => {
              const color = hasColors ? colorValues[index % colorValues.length] : null;

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

          // Toggle-based glitch
          {
            const toggleBtns = document.querySelectorAll(".plan-selection__toggle-option");
            const swapElems = document.querySelectorAll("[data-toggle-target]");

            // store initial text
            swapElems.forEach((el) => {
              if (!el.dataset.toggleStart) {
                el.dataset.toggleStart = el.textContent.trim();
              }
            });

            const runGlitch = (el, newText) => {
              if (!el) return;

              el.textContent = newText;

              gsap.to(el, {
                scrambleText: {
                  text: newText,
                  chars: "0123456789#X%*",
                  revealDelay: 0.125,
                },
                duration: 0.5,
              });
            };

            toggleBtns.forEach((btn) => {
              btn.addEventListener("click", () => {
                toggleBtns.forEach((b) => b.setAttribute("aria-selected", "false"));
                btn.setAttribute("aria-selected", "true");

                const mode = btn.dataset.toggleOption; // "start" or "end"

                swapElems.forEach((el) => {
                  const newText = mode === "start" ? el.dataset.toggleStart : el.dataset.toggleEnd;
                  if (newText) runGlitch(el, newText);
                });
              });
            });
          }
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
              let tileCount = 192;
              let minWidth = "6%";

              if (tileSize === "large") {
                tileCount = 40;
                minWidth = "12%";
              } else if (tileSize === "small") {
                tileCount = 520;
                minWidth = "3%";
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

        // Marquee component
        {
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

              // Scroll direction swap
              if (scrollAlternate) {
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

                  // Toggle class based on scroll direction
                  marqueeBlock.classList.toggle("marquee--alternated", !isScrollingDown);

                  currentScroll = window.scrollY;
                };

                window.addEventListener("scroll", adjustTimeScale, {
                  passive: true,
                });
              }
            }
          });
        }

        // Parallax Util
        {
          document.querySelectorAll(".parallax").forEach((el) => {
            const dataY = el.dataset.parallaxY || "15%";
            const dataScrub = parseFloat(el.dataset.parallaxScrub) || 1;
            const dataStart = el.dataset.parallaxStart || "top bottom";
            const dataEnd = el.dataset.parallaxEnd || "bottom top";
            const dataHero = el.dataset.parallaxHero === "true";

            gsap.to(el, {
              y: dataY,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: dataHero ? `top ${headerHeight}` : dataStart,
                end: dataEnd,
                scrub: dataScrub,
              },
            });
          });
        }

        // Scroll Horizontal (pinned section)
        {
          const scrollHorizontal = document.querySelectorAll(".scroll-horizontal");

          let scrollHorizontalScrub = maxSm ? 1 : 0.5;

          scrollHorizontal.forEach((el) => {
            let container = el.querySelector(".scroll-horizontal__container");
            let slider = el.querySelector(".scroll-horizontal__slider");
            let imgs = el.querySelectorAll(".scroll-horizontal__figure--parallax img");
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
                  scrub: scrollHorizontalScrub,
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
                    scrub: scrollHorizontalScrub,
                  },
                }
              );
            });
          });
        }

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
              const triggerStep = section.querySelector(
                `.scroll-stack__pin-step-${panelIndex + 1}`
              );

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

        // Text Fade
        {
          const fadeElems = document.querySelectorAll(".text-fade");

          fadeElems.forEach((el) => {
            const fadeType = el.dataset.fadeType || "words"; // "chars" or "words"
            const fadeStyle = el.dataset.fadeStyle || "random"; // "linear" or "random"
            const fadeDuration = parseFloat(el.dataset.fadeDuration) || 0.25;
            const fadeScrub = el.dataset.fadeScrub === "true"; // default false
            const fadeOnce = !fadeScrub && el.dataset.fadeOnce === "true"; // only if scrub is false
            const fadeStart = el.dataset.fadeStart || "top 98%";
            const fadeEnd = el.dataset.fadeEnd || "bottom 2%";
            const fadeMarkers = el.dataset.fadeMarkers || false;

            const split = new SplitText(el, {
              type: fadeType,
              [`${fadeType}Class`]: `text-fade__${fadeType}`,
              tag: "span",
            });

            const targets = fadeType === "words" ? split.words : split.chars;

            const scrollTriggerConfig = {
              trigger: el,
              start: fadeStart,
              end: fadeEnd,
              scrub: fadeScrub || false,
              markers: fadeMarkers,
            };

            if (!fadeScrub) {
              scrollTriggerConfig.toggleActions = fadeOnce
                ? "play none none none"
                : "play reset play reset";

              scrollTriggerConfig.onEnter = () => el.classList.add("text-fade--active");

              scrollTriggerConfig.onLeaveBack = () => {
                if (!fadeOnce) el.classList.remove("text-fade--active");
              };

              scrollTriggerConfig.once = fadeOnce;
            }

            const tl = gsap.timeline({ scrollTrigger: scrollTriggerConfig });

            tl.fromTo(
              fadeStyle === "random" ? gsap.utils.shuffle(targets) : targets,
              { opacity: 0 },
              {
                opacity: 1,
                duration: fadeDuration,
                stagger: 0.0125,
                ease: "linear",
              }
            );
          });
        }

        // Text Fill
        {
          const fillTextElems = document.querySelectorAll(".text-fill");

          fillTextElems.forEach((el) => {
            const scrubVal = el.dataset.fillScrub;
            const onceVal = el.dataset.fillOnce;
            const durationVal = el.dataset.fillDuration || 1;
            const markersVal = el.dataset.fillMarkers === "true";

            const scrub = scrubVal !== "false"; // default true
            const once = onceVal === "true"; // default false

            // Defaults change based on scrub true or false
            const defaultStart = scrub ? "top 90%" : "top 98%";
            const defaultEnd = scrub ? "bottom 60%" : "bottom 2%";

            const startVal = el.dataset.fillStart || defaultStart;
            const endVal = el.dataset.fillEnd || defaultEnd;

            const scrollTrigger = {
              trigger: el,
              start: startVal,
              end: endVal,
              ...(scrub
                ? { scrub }
                : {
                    toggleActions: once ? "play none none none" : "play reset play reset",
                  }),
              markers: markersVal,
            };

            gsap.fromTo(
              el,
              { backgroundSize: "0%" },
              {
                backgroundSize: "100%",
                scrollTrigger,
                ...(scrub ? {} : { duration: durationVal }),
              }
            );
          });
        }

        // Text Reveal
        {
          const revealElems = document.querySelectorAll(".text-reveal");

          revealElems.forEach((el) => {
            const revealType = el.dataset.revealType || "words";
            const revealFrom = el.dataset.revealFrom || "bottom";
            const revealDuration = parseFloat(el.dataset.revealDuration) || 0.2;
            const revealDelay = parseFloat(el.dataset.revealDelay) || 0;
            const revealStagger = parseFloat(el.dataset.revealStagger) || 0.05;
            const revealEase = el.dataset.revealEase || "easeSudden";
            const revealScrub = el.dataset.revealScrub === "true";
            const revealOnce = !revealScrub && el.dataset.revealOnce === "true";
            const revealTrigger = el.dataset.revealTrigger || el; // Requires . or #
            const revealStart = el.dataset.revealStart || "top 98%";
            const revealEnd = el.dataset.revealEnd || "bottom 2%";
            const revealMarkers = el.dataset.revealMarkers === "true";

            const split = new SplitText(el, {
              type: revealType,
              [`${revealType}Class`]: `text-reveal__${revealType}`,
              tag: "span",
            });

            const targets =
              revealType === "lines"
                ? split.lines
                : revealType === "words"
                ? split.words
                : split.chars;

            targets.forEach((target) => {
              const wrapper = document.createElement("span");
              wrapper.classList.add("outer-span");
              target.parentNode.insertBefore(wrapper, target);
              wrapper.appendChild(target);
            });

            // Track state to support loader delay
            let hasLeftViewportAfterLoad = false;
            let currentTimeline = null;

            // Function to create the timeline
            const createTimeline = (useAdjustedDelay) => {
              // Kill existing timeline if it exists
              if (currentTimeline) {
                currentTimeline.scrollTrigger?.kill();
                currentTimeline.kill();
              }

              const scrollTriggerConfig = {
                trigger: revealTrigger,
                start: revealStart,
                end: revealEnd,
                scrub: revealScrub,
                markers: revealMarkers,
              };

              if (!revealScrub) {
                scrollTriggerConfig.toggleActions = revealOnce
                  ? "play none none none"
                  : "play reset play reset";
                scrollTriggerConfig.onEnter = () => {
                  el.classList.add("text-reveal--active");
                };
                scrollTriggerConfig.onEnterBack = () => {
                  el.classList.add("text-reveal--active");
                };
                scrollTriggerConfig.onLeaveBack = () => {
                  if (!revealOnce) el.classList.remove("text-reveal--active");
                };
                scrollTriggerConfig.onLeave = () => {
                  if (!revealOnce) el.classList.remove("text-reveal--active");
                };
                scrollTriggerConfig.once = revealOnce;
              }

              const tl = gsap.timeline({ scrollTrigger: scrollTriggerConfig });

              const finalDelay = useAdjustedDelay
                ? revealDelay + globalConfig.loadDuration
                : revealDelay;

              tl.fromTo(
                targets,
                { y: revealFrom === "top" ? "-100%" : "100%" },
                {
                  y: "0",
                  duration: revealDuration,
                  delay: finalDelay,
                  stagger: revealStagger,
                  ease: revealEase,
                }
              );

              currentTimeline = tl;
              return tl;
            };

            // Create initial timeline with adjusted delay if loading
            createTimeline(isLoading && el.dataset.loaderAware !== undefined);

            // Set up IntersectionObserver for loader-aware elements
            if (el.dataset.loaderAware !== undefined) {
              const observer = new IntersectionObserver(
                (entries) => {
                  entries.forEach((entry) => {
                    if (!entry.isIntersecting && loaderHasCompleted && !hasLeftViewportAfterLoad) {
                      hasLeftViewportAfterLoad = true;
                      createTimeline(false); // Rebuild with original delay
                      observer.disconnect(); // Only need this once
                    }
                  });
                },
                { threshold: 0 }
              );
              observer.observe(el);
            }
          });
        }

        // Text Scale
        {
          const scaleElems = document.querySelectorAll(".text-scale");

          scaleElems.forEach((el) => {
            const scaleType = el.dataset.scaleType || "words"; // "chars" or "words"
            const scaleStyle = el.dataset.scaleStyle || "random"; // "linear" or "random"
            const scaleDuration = parseFloat(el.dataset.scaleDuration) || 0.25;
            const scaleScrub = el.dataset.scaleScrub === "true";
            const scaleOnce = !scaleScrub && el.dataset.scaleOnce === "true";
            const scaleTrigger = el.dataset.scaleTrigger || el; // Requires . or #
            const scaleStart = el.dataset.scaleStart || "top 98%";
            const scaleEnd = el.dataset.scaleEnd || "bottom 2%";
            const scaleMarkers = el.dataset.scaleMarkers || false;

            const split = new SplitText(el, {
              type: scaleType,
              [`${scaleType}Class`]: `text-scale__${scaleType}`,
              tag: "span",
            });

            const targets = scaleType === "words" ? split.words : split.chars;

            // Calculate transform-origin based on each element’s position
            const parentBox = el.getBoundingClientRect();
            targets.forEach((word) => {
              const box = word.getBoundingClientRect();
              const centerX = (box.left + box.width / 2 - parentBox.left) / parentBox.width;

              // Map 0–1 range to useful values for transform-origin
              // left edge = "0% 50%", right edge = "100% 50%", middle = "50% 50%"
              const originX = `${Math.round((1 - centerX) * 100)}%`;
              word.style.transformOrigin = `${originX} 50%`;
            });

            const scrollTriggerConfig = {
              trigger: scaleTrigger,
              start: scaleStart,
              end: scaleEnd,
              scrub: scaleScrub || false,
              markers: scaleMarkers,
            };

            if (!scaleScrub) {
              scrollTriggerConfig.toggleActions = scaleOnce
                ? "play none none none"
                : "play reset play reset";

              scrollTriggerConfig.onEnter = () => el.classList.add("text-scale--active");

              scrollTriggerConfig.onLeaveBack = () => {
                if (!scaleOnce) el.classList.remove("text-scale--active");
              };

              scrollTriggerConfig.once = scaleOnce;
            }

            const tl = gsap.timeline({ scrollTrigger: scrollTriggerConfig });

            tl.fromTo(
              scaleStyle === "random" ? gsap.utils.shuffle(targets) : targets,
              { scale: 0, opacity: 0 },
              {
                scale: 1,
                opacity: 1,
                duration: scaleDuration,
                stagger: 0.0125,
                ease: "linear",
              }
            );
          });
        }

        // Tunnel
        {
          document.querySelectorAll(".tunnel").forEach((el) => {
            const tunnelClip = el.querySelector(".tunnel-clip");
            const tunnelImg = el.querySelector(".tunnel__img");
            const tunnelVid = el.querySelector(".tunnel__vid");
            const tunnelMedia = tunnelImg || tunnelVid;

            const offset = tunnelMedia.dataset.parallaxOffset;
            const scrub = parseFloat(tunnelMedia.dataset.parallaxScrub) || 0;
            const centered = el.classList.contains("tunnel--centered");

            if (centered) {
              const tunnelPin = el.querySelector(".tunnel-centered--pin");
              const clipDuration = "+=100%"; // 50% finishes before message comes

              gsap.to(tunnelPin, {
                scrollTrigger: {
                  trigger: tunnelPin,
                  start: `center center`,
                  end: "+=100%",
                  pin: true,
                },
              });

              gsap.to(tunnelClip, {
                width: "100%",
                height: "100vh",
                borderRadius: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: `top top`,
                  end: clipDuration,
                  scrub,
                },
              });

              gsap.to(tunnelMedia, {
                rotate: "0deg",
                filter: "brightness(1)",
                scrollTrigger: {
                  trigger: tunnelPin,
                  start: `top top`,
                  end: clipDuration,
                  scrub,
                },
              });
            } else {
              gsap.to(tunnelClip, {
                width: "100%",
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top 70%", // Control when the image gets wider
                  end: "top top",
                  scrub,
                },
              });
            }

            // Parallax on image (defaut for both)
            gsap.from(tunnelMedia, {
              y: offset,
              rotate: "-1deg",
              filter: "brightness(0.75)",
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "top top",
                scrub,
              },
            });
          });
        }

        // Typing Text Effects
        {
          const injectTypingElements = (el, cursorType) => {
            const typingSpan = document.createElement("span");
            typingSpan.classList.add("typing-text");
            el.textContent = "";
            el.appendChild(typingSpan);

            const cursorSpan = document.createElement("span");
            cursorSpan.classList.add("typing-text-cursor");
            setupCursorSpan(cursorSpan, cursorType);
            el.appendChild(cursorSpan);

            return { typingSpan, cursorSpan };
          };

          const setupCursorSpan = (cursorSpan, cursorType) => {
            if (cursorType === "caret") {
              cursorSpan.textContent = "|";
            } else if (cursorType === "underscore") {
              cursorSpan.textContent = "_";
            } else if (cursorType === "none") {
              cursorSpan.style.display = "none";
            } else {
              cursorSpan.textContent = "|";
            }
          };

          // Typing Cycle
          const typingCycleElems = document.querySelectorAll(".typing-cycle");

          typingCycleElems.forEach((el) => {
            const words = el.dataset.typingCycleWords.split(",").map((w) => w.trim());
            const colors = (el.dataset.typingCycleColors || "")
              .split(",")
              .map((c) => c.trim())
              .filter((c) => c);

            const speedIn = parseInt(el.dataset.typingSpeedIn, 10) || 120;
            const speedOut = parseInt(el.dataset.typingSpeedOut, 10) || 50;
            const interval = parseInt(el.dataset.typingCycleInterval, 10) || 2000;
            const cursorType = el.dataset.typingCursor || "caret";
            const delay = parseInt(el.dataset.typingDelay, 10) || 0;
            const onScroll = el.dataset.typingOnScroll === "true";
            let hasStarted = false;

            const { typingSpan } = injectTypingElements(el, cursorType);

            let wordIndex = 0;
            let charIndex = 0;
            let isDeleting = false;

            const type = () => {
              const currentWord = words[wordIndex];
              const displayedText = isDeleting
                ? currentWord.substring(0, charIndex--)
                : currentWord.substring(0, charIndex++);

              typingSpan.textContent = displayedText;

              if (!isDeleting && charIndex === 1 && colors.length) {
                const currentColor = colors[wordIndex % colors.length];
                typingSpan.style.color = currentColor;
              }

              if (!isDeleting && charIndex > currentWord.length) {
                setTimeout(() => {
                  isDeleting = true;
                  type();
                }, interval);
              } else if (isDeleting && charIndex < 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                charIndex = 0;
                type();
              } else {
                const baseSpeed = isDeleting ? speedOut : speedIn;
                const humanizedDelay = baseSpeed + Math.random() * 100 - 50;
                setTimeout(type, Math.max(humanizedDelay, 20));
              }
            };

            if (onScroll) {
              ScrollTrigger.create({
                trigger: el,
                start: "top bottom",
                onEnter: () => {
                  if (!hasStarted) {
                    hasStarted = true;
                    setTimeout(type, delay);
                  }
                },
                onEnterBack: () => {
                  if (!hasStarted) {
                    hasStarted = true;
                    setTimeout(type, delay);
                  }
                },
              });
            } else {
              setTimeout(type, delay);
            }
          });

          // Typing Scroll
          const typingScrollElems = document.querySelectorAll(".typing-scroll");

          typingScrollElems.forEach((el) => {
            if (!el.dataset.originalText) {
              el.dataset.originalText = el.textContent.trim();
            }
            const speed = parseInt(el.dataset.typingSpeed, 10) || 50;
            const once = el.dataset.typingOnce === "true";
            const cursorType = el.dataset.typingCursor || "caret";
            const delay = parseInt(el.dataset.typingDelay, 10) || 0;

            const { typingSpan } = injectTypingElements(el, cursorType);

            let hasStarted = false;
            let timeoutId;

            const typeOut = () => {
              if (once && hasStarted) return;

              if (timeoutId) clearTimeout(timeoutId);

              hasStarted = true;
              typingSpan.textContent = "";
              let charIndex = 0;
              const text = el.dataset.originalText;

              const typeChar = () => {
                if (charIndex < text.length) {
                  typingSpan.textContent += text.charAt(charIndex++);
                  const charDelay = speed + Math.random() * 40 - 20;
                  timeoutId = setTimeout(typeChar, Math.max(charDelay, 20));
                }
              };

              timeoutId = setTimeout(typeChar, delay);
            };

            const stopTyping = () => {
              if (!once && timeoutId) {
                clearTimeout(timeoutId);
              }
            };

            ScrollTrigger.create({
              trigger: el,
              start: "top bottom",
              onEnter: typeOut,
              onEnterBack: typeOut,
              onLeave: stopTyping,
              onLeaveBack: stopTyping,
            });
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

      // Custom animations — require dev work (Consider placement of code block. Sometimes may need to be placed above or beneath others)
      {
        // Animate any element with the class 'gsap-animate' using the 'gsap-animated' companion class. Comes with different data attributes for customization.
        {
          const gsapElems = document.querySelectorAll(".gsap-animate");

          gsapElems.forEach((gsapElem) => {
            const animOnce = gsapElem.dataset.gsapOnce === "true";
            const animTrigger = gsapElem.dataset.gsapTrigger || gsapElem;
            const animStart = gsapElem.dataset.gsapStart || "top 98%";
            const animEnd = gsapElem.dataset.gsapEnd || "bottom 2%";
            const animMarkers = gsapElem.dataset.gsapMarkers === "true";
            const animDelay = parseFloat(gsapElem.dataset.gsapDelay) || 0;

            // Track state for loader-aware elements
            let hasLeftViewportAfterLoad = false;
            let currentScrollTrigger = null;
            let pendingTimeout = null; // Track pending setTimeout

            // Function to create the ScrollTrigger
            const createScrollTrigger = (useAdjustedDelay) => {
              // Clear any pending timeouts
              if (pendingTimeout) {
                clearTimeout(pendingTimeout);
                pendingTimeout = null;
              }

              if (currentScrollTrigger) {
                currentScrollTrigger.kill();
              }

              const finalDelay = useAdjustedDelay
                ? animDelay + globalConfig.loadDuration
                : animDelay;

              // Create a wrapper function that applies delay
              const addClassWithDelay = () => {
                pendingTimeout = setTimeout(() => {
                  gsapElem.classList.add("gsap-animated");
                  pendingTimeout = null;
                }, finalDelay * 1000);
              };

              const removeClassImmediate = () => {
                if (pendingTimeout) {
                  clearTimeout(pendingTimeout);
                  pendingTimeout = null;
                }
                gsapElem.classList.remove("gsap-animated");
              };

              if (animOnce) {
                currentScrollTrigger = ScrollTrigger.create({
                  trigger: animTrigger,
                  start: animStart,
                  end: animEnd,
                  once: true,
                  onEnter: addClassWithDelay,
                  markers: animMarkers,
                });
              } else {
                currentScrollTrigger = ScrollTrigger.create({
                  trigger: animTrigger,
                  start: animStart,
                  end: animEnd,
                  onEnter: addClassWithDelay,
                  onLeave: removeClassImmediate,
                  onEnterBack: addClassWithDelay,
                  onLeaveBack: removeClassImmediate,
                  markers: animMarkers,
                });
              }

              return currentScrollTrigger;
            };

            // Handle animation with site "loading" delay
            const isLoading = getLoadState().isLoading;
            createScrollTrigger(isLoading && gsapElem.dataset.loaderAware !== undefined);

            // Set up IntersectionObserver for loader-aware elements
            if (gsapElem.dataset.loaderAware !== undefined) {
              const observer = new IntersectionObserver(
                (entries) => {
                  entries.forEach((entry) => {
                    if (!entry.isIntersecting && loaderHasCompleted && !hasLeftViewportAfterLoad) {
                      hasLeftViewportAfterLoad = true;

                      setTimeout(() => {
                        createScrollTrigger(false);
                      }, 100);

                      observer.disconnect();
                    }
                  });
                },
                { threshold: 0 }
              );
              observer.observe(gsapElem);
            }
          });
        }

        // GSAP Stagger util
        {
          const staggerGroups = document.querySelectorAll(".gsap-stagger");

          staggerGroups.forEach((group) => {
            const children = group.querySelectorAll(".gsap-stagger-child");
            if (!children.length) return;

            // Use css to control duration and initial delay (not stagger delay)
            const staggerDelay = parseFloat(group.dataset.staggerDelay) || 0.1;
            const staggerStart = group.dataset.staggerStart || "top 96%";
            const staggerOnce = group.dataset.staggerOnce === "true";
            const staggerMarkers = group.dataset.markers === "true";

            const animateIn = () => {
              children.forEach((child, i) => {
                setTimeout(() => {
                  child.classList.add("gsap-stagger-animate");
                }, i * staggerDelay * 1000);
              });
            };

            const animateOut = () => {
              children.forEach((child) => {
                child.classList.remove("gsap-stagger-animate");
              });
            };

            ScrollTrigger.create({
              trigger: group,
              start: staggerStart,
              markers: staggerMarkers,
              onEnter: animateIn,
              // Uncomment these if you want 'animation on leave/enter back'
              // onEnterBack: () => {
              //   if (!staggerOnce) animateIn();
              // },
              // onLeave: () => {
              //   if (!staggerOnce) animateOut();
              // },
              onLeaveBack: () => {
                if (!staggerOnce) animateOut();
              },
            });
          });
        }

        // GSAP SplitText (characters & words)
        {
          const splitCharacters = document.querySelectorAll(".split-chars");
          const splitWords = document.querySelectorAll(".split-words");

          splitCharacters.forEach((el) => {
            new SplitText(el, {
              type: "chars",
              charsClass: "split-chars__char++",
              tag: "span",
            });
          });

          splitWords.forEach((el) => {
            new SplitText(el, {
              type: "words",
              wordsClass: "split-words__word++",
              tag: "span",
            });
          });
        }
      }
    }
  );

  // Refresh ScrollTrigger after a brief page load. This allows images to use lazy loading and content to generate from 11ty
  window.addEventListener("load", () => {
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500); // try 200–500ms if needed
  });

  // Greater than 520 so it doesn't refresh on  mobile(dvh)
  if (window.innerWidth > 520 && mqMouse) {
    window.addEventListener("resize", () => {
      ScrollTrigger.refresh();
    });
  }

  // Any page specific scrollTrigger fix (Optional)
  // if (document.querySelector(".main-library")) {
  //   window.addEventListener("load", () => {
  //     setTimeout(() => {
  //       ScrollTrigger.refresh();
  //     }, 500); // try 200–500ms if needed
  //   });
  // }
}
