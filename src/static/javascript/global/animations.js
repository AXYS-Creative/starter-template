import { globalConfig, mqMouse } from "../util.js";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, CustomEase);

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
  // gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, CustomEase);

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
    },
    (context) => {
      let { maxSm, maxMd, maxLg } = context.conditions;

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

        // Scroll Horizontal (pinned section)
        {
          const scrollHorizontal = document.querySelectorAll(".scroll-horizontal");

          let scrollHorizontalScrub = maxSm ? 1 : 0.5;

          scrollHorizontal.forEach((el) => {
            let container = el.querySelector(".scroll-horizontal__container");
            let pin = el.querySelector(".scroll-horizontal__pin");
            let slider = el.querySelector(".scroll-horizontal__slider");
            let imgs = el.querySelectorAll(".scroll-horizontal__figure--parallax img");

            const sliderWidth = slider.scrollWidth;
            const containerWidth = container.offsetWidth;
            const distanceToTranslate = sliderWidth - containerWidth;

            let duration = maxSm ? "+=150%" : "+=200%";

            // Actual Pinning
            gsap.to(pin, {
              scrollTrigger: {
                trigger: pin,
                start: "center center",
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
                  trigger: pin,
                  start: "center center",
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
                    trigger: pin,
                    start: "center center",
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
        // GSAP SplitText utility
        {
          const splitTextElements = document.querySelectorAll(".split-text");

          splitTextElements.forEach((el) => {
            const splitType = el.dataset.splitType || "words"; // e.g. "words", "chars", "lines", "words,chars"
            const customClass = el.dataset.splitClass || "";

            const types = splitType.split(",").map((t) => t.trim());
            const config = {
              type: splitType, // SplitText accepts "words,chars" etc.
              tag: "span",
            };

            if (types.includes("chars")) {
              config.charsClass = `split-text__char++ ${customClass}`;
            }

            if (types.includes("words")) {
              config.wordsClass = `split-text__word++ ${customClass}`;
            }

            if (types.includes("lines")) {
              config.linesClass = `split-text__line++ ${customClass}`;
            }

            new SplitText(el, config);
          });
        }

        // GSAP Animate util - Loader edition
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

        // GSAP Animate util - Standard edition
        // {
        //   const gsapElems = document.querySelectorAll(".gsap-animate");

        //   gsapElems.forEach((gsapElem) => {
        //     const animOnce = gsapElem.dataset.gsapOnce === "true";
        //     const animTrigger = gsapElem.dataset.gsapTrigger || gsapElem;
        //     const animStart = gsapElem.dataset.gsapStart || "top 98%";
        //     const animEnd = gsapElem.dataset.gsapEnd || "bottom 2%";
        //     const animMarkers = gsapElem.dataset.gsapMarkers === "true";

        //     if (animOnce) {
        //       ScrollTrigger.create({
        //         trigger: animTrigger,
        //         start: animStart,
        //         end: animEnd,
        //         once: true,
        //         onEnter: () => {
        //           gsapElem.classList.add("gsap-animated");
        //         },
        //         markers: animMarkers,
        //       });
        //     } else {
        //       // Repeating animation
        //       ScrollTrigger.create({
        //         trigger: animTrigger,
        //         start: animStart,
        //         end: animEnd,
        //         onEnter: () => gsapElem.classList.add("gsap-animated"),
        //         onLeave: () => gsapElem.classList.remove("gsap-animated"),
        //         onEnterBack: () => gsapElem.classList.add("gsap-animated"),
        //         onLeaveBack: () => gsapElem.classList.remove("gsap-animated"),
        //         markers: animMarkers,
        //       });
        //     }
        //   });
        // }

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
