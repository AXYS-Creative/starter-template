const createMarkers = (color, indent) => ({
  startColor: color,
  endColor: color,
  fontSize: "12px",
  indent: indent,
  fontWeight: 500,
});

export const whiteMarkers = createMarkers("white", 20);
export const blackMarkers = createMarkers("black", 20);
export const coralMarkers = createMarkers("coral", 120);
export const navyMarkers = createMarkers("navy", 220);

let responsiveGsap = gsap.matchMedia();

responsiveGsap.add(
  {
    maxSm: "(max-width: 480px)",
    maxMd: "(max-width: 768px)",
    minMd: "(min-width: 769px)",
  },
  (context) => {
    let { maxSm, maxMd } = context.conditions;

    // GSAP Animate util - Standard edition
    {
      const gsapElems = document.querySelectorAll(".gsap-animate");

      gsapElems.forEach((gsapElem) => {
        const animOnce = gsapElem.dataset.gsapOnce === "true";
        const animTrigger = gsapElem.dataset.gsapTrigger || gsapElem;
        const animStart = gsapElem.dataset.gsapStart || "top 98%";
        const animEnd = gsapElem.dataset.gsapEnd || "bottom 2%";
        const animMarkers = gsapElem.dataset.gsapMarkers === "true";

        if (animOnce) {
          ScrollTrigger.create({
            trigger: animTrigger,
            start: animStart,
            end: animEnd,
            once: true,
            onEnter: () => {
              gsapElem.classList.add("gsap-animated");
            },
            markers: animMarkers,
          });
        } else {
          // Repeating animation
          ScrollTrigger.create({
            trigger: animTrigger,
            start: animStart,
            end: animEnd,
            onEnter: () => gsapElem.classList.add("gsap-animated"),
            onLeave: () => gsapElem.classList.remove("gsap-animated"),
            onEnterBack: () => gsapElem.classList.add("gsap-animated"),
            onLeaveBack: () => gsapElem.classList.remove("gsap-animated"),
            markers: animMarkers,
          });
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

    // // GSAP SplitText utility (Is this even used?)
    // {
    //   const splitTextElements = document.querySelectorAll(".split-text");

    //   splitTextElements.forEach((el) => {
    //     const splitType = el.dataset.splitType || "words"; // e.g. "words", "chars", "lines", "words,chars"
    //     const customClass = el.dataset.splitClass || "";

    //     const types = splitType.split(",").map((t) => t.trim());
    //     const config = {
    //       type: splitType, // SplitText accepts "words,chars" etc.
    //       tag: "span",
    //     };

    //     if (types.includes("chars")) {
    //       config.charsClass = `split-text__char++ ${customClass}`;
    //     }

    //     if (types.includes("words")) {
    //       config.wordsClass = `split-text__word++ ${customClass}`;
    //     }

    //     if (types.includes("lines")) {
    //       config.linesClass = `split-text__line++ ${customClass}`;
    //     }

    //     new SplitText(el, config);
    //   });
    // }
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
