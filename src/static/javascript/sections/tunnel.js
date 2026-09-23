import { queuePinnedSection, afterPinnedSections } from "../utils/pin-order.js";

// gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll(".tunnel").forEach((el) => {
  const tunnelClip = el.querySelector(".tunnel-clip");
  const tunnelImg = el.querySelector(".tunnel__img");
  const tunnelVid = el.querySelector(".tunnel__vid");
  const tunnelMedia = tunnelImg || tunnelVid;

  const offset = tunnelMedia.dataset.parallaxOffset;
  const scrub = parseFloat(tunnelMedia.dataset.parallaxScrub) || 0;
  const centered = el.classList.contains("tunnel--centered");
  const reversed = el.classList.contains("tunnel--reversed");

  if (centered) {
    const tunnelPin = el.querySelector(".tunnel-centered--pin");
    const clipDuration = "+=100%"; // 50% finishes before message comes

    // Create in actual DOM order relative to any other pinned section on the
    // page — see utils/pin-order.js for why that matters.
    queuePinnedSection(tunnelPin, () => {
      gsap.to(tunnelPin, {
        scrollTrigger: {
          trigger: tunnelPin,
          start: `center center`,
          end: "+=100%",
          pin: true,
        },
      });

      // To reverse the effect, we literally just need to call gsap.from() instead of gsap.to(). This approach skips an if/else statement, keeping things more DRY.
      const tween = reversed ? "from" : "to"; // succinct if/else
      gsap[tween](tunnelClip, {
        width: "100vw",
        height: "100vh",
        borderRadius: 0,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: clipDuration,
          scrub,
        },
      });

      gsap[tween](tunnelMedia, {
        rotate: "0deg",
        filter: "brightness(1)",
        scrollTrigger: {
          trigger: tunnelPin,
          start: "top top",
          end: clipDuration,
          scrub,
        },
      });
    });
  } else {
    //
    // Non centered tunnels
    //
    // Deferred (not created immediately) for the same reason as the
    // centered pin above: `trigger: el`'s position depends on any pinned
    // section's spacer above it on the page — see utils/pin-order.js.
    afterPinnedSections(() => {
      if (reversed) {
        gsap.to(tunnelClip, {
          width: "80vw",
          ease: "none",
          borderRadius: "var(--radius)",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom 30%", // Control when the image shrinks
            scrub,
          },
        });
      } else {
        gsap.to(tunnelClip, {
          width: "100vw",
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 70%", // Control when the image gets wider
            end: "top top",
            scrub,
          },
        });
      }
    });
  }

  // Parallax on image — same deferral reasoning as above.
  afterPinnedSections(() => {
    if (!centered && reversed) {
      // Special treatment for non centered reversed tunnels (fourth example)
      gsap.to(tunnelMedia, {
        y: offset,
        // rotate: "-1deg",
        filter: "brightness(0.75)",
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom top",
          scrub,
        },
      });
    } else {
      // Default for the rest
      gsap.from(tunnelMedia, {
        y: offset,
        // rotate: "-1deg",
        filter: "brightness(0.75)",
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "top top",
          scrub,
        },
      });
    }
  });
});
