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
