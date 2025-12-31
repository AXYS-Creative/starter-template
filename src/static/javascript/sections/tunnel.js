// gsap.registerPlugin(ScrollTrigger);

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
