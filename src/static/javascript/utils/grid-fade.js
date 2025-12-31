// Util - shuffle an array in place
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

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
