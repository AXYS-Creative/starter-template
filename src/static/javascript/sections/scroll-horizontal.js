let responsiveGsap = gsap.matchMedia();

responsiveGsap.add(
  {
    maxSm: "(max-width: 480px)",
    maxMd: "(max-width: 768px)",
    minMd: "(min-width: 769px)",
  },
  (context) => {
    let { maxSm } = context.conditions;

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
  }
);
