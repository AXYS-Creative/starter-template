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
