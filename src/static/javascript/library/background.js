// Grid effect, requires canvas in html
if (document.getElementById("grid-bg")) {
  const CELL_SIZE = 48;
  const STROKE_COLOR_HEX = "#3d3d3d";
  const STARTING_ALPHA = 255;
  const BACKGROUND_COLOR = "#101010";
  const PROB_OF_NEIGHBOR = 0.5;
  const AMT_FADE_PER_FRAME = 5;
  const STROKE_WIDTH = 1;
  const SHOW_HOVERED_CELL = false;
  const IS_TOUCH_DEVICE = window.matchMedia("(pointer: coarse)").matches;
  const TOUCH_INTERVAL_MS = 7500; // Interval between simulated touches

  let freezeGridFade = false;

  const canvas = document.getElementById("grid-bg");
  const ctx = canvas.getContext("2d");

  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = "fixed";
  canvas.style.inset = 0;
  canvas.style.zIndex = -1;

  let numRows = Math.ceil(height / CELL_SIZE);
  let numCols = Math.ceil(width / CELL_SIZE);

  let currentRow = -1;
  let currentCol = -1;
  let allNeighbors = [];

  let mouseX = -1;
  let mouseY = -1;
  let isMouseMoving = false;
  let lastMouseMoveTime = 0;

  window.addEventListener("mousemove", (e) => {
    if (disableBgEffect(e)) {
      mouseX = -1;
      mouseY = -1;
      isMouseMoving = false;
      return;
    }

    mouseX = e.clientX;
    mouseY = e.clientY;
    isMouseMoving = true;
    lastMouseMoveTime = Date.now();
  });

  window.addEventListener("resize", () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    numRows = Math.ceil(height / CELL_SIZE);
    numCols = Math.ceil(width / CELL_SIZE);
  });

  function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function disableBgEffect(e) {
    const target = e.target;
    const isUtilityClass = target.closest(".disable-bg");

    return isUtilityClass;
  }

  function getRandomNeighbors(row, col) {
    const neighbors = [];

    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue;

        const neighborRow = row + dRow;
        const neighborCol = col + dCol;

        const isInBounds =
          neighborRow >= 0 &&
          neighborRow < numRows &&
          neighborCol >= 0 &&
          neighborCol < numCols;

        if (isInBounds && Math.random() < PROB_OF_NEIGHBOR) {
          neighbors.push({
            row: neighborRow,
            col: neighborCol,
            opacity: STARTING_ALPHA,
          });
        }
      }
    }

    return neighbors;
  }

  function draw() {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);

    if (mouseX >= 0 && mouseY >= 0) {
      const row = Math.floor(mouseY / CELL_SIZE);
      const col = Math.floor(mouseX / CELL_SIZE);

      if (row !== currentRow || col !== currentCol) {
        currentRow = row;
        currentCol = col;

        allNeighbors.push(...getRandomNeighbors(row, col));
      }

      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;
      if (SHOW_HOVERED_CELL) {
        ctx.lineWidth = STROKE_WIDTH;
        ctx.strokeStyle = STROKE_COLOR_HEX;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }

    const now = Date.now();

    allNeighbors = allNeighbors.filter((neighbor) => {
      // Delay-based fade-in trigger
      if (neighbor.revealDelay && now >= neighbor.revealDelay) {
        neighbor.fadingIn = true;
        delete neighbor.revealDelay; // remove to avoid retriggering
      }

      // Fade-in and fade-out logic
      if (neighbor.fadingIn) {
        neighbor.opacity += AMT_FADE_PER_FRAME;
        if (neighbor.opacity >= STARTING_ALPHA) {
          neighbor.opacity = STARTING_ALPHA;
          neighbor.fadingIn = false;
        }
      } else if (!freezeGridFade) {
        if (neighbor.fadeOutDelay && now < neighbor.fadeOutDelay) {
          // wait for delay
        } else {
          neighbor.opacity = Math.max(0, neighbor.opacity - AMT_FADE_PER_FRAME);
        }
      }

      const x = neighbor.col * CELL_SIZE;
      const y = neighbor.row * CELL_SIZE;
      const alpha = neighbor.opacity / 255;
      ctx.strokeStyle = hexToRgba(STROKE_COLOR_HEX, alpha);
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

      return neighbor.opacity > 0 || neighbor.revealDelay;
    });

    requestAnimationFrame(draw);
  }

  draw();

  // Interval animation (optional)
  function triggerAmbientGridLoop() {
    // const animation = "ripple-out";
    // const stagger = 50;
    const animation = "random";
    const stagger = 100;

    setInterval(() => {
      if (!freezeGridFade) {
        revealAllGridSquares({ animation, stagger });
      }
    }, TOUCH_INTERVAL_MS);
  }

  // Mobile only animation. Remove conditional for all devices.
  // if (IS_TOUCH_DEVICE) {
  triggerAmbientGridLoop();
  // }

  //
  //
  // Configurable animations with GSAP
  function getRevealDelay(row, col, { animation, stagger }) {
    const centerRow = Math.floor(numRows / 2);
    const centerCol = Math.floor(numCols / 2);

    switch (animation) {
      case "stack-top":
        return row * stagger;

      case "stack-bottom":
        return (numRows - row) * stagger;

      case "stack-left":
        return col * stagger;

      case "stack-right":
        return (numCols - col) * stagger;

      case "ripple-out":
        return Math.hypot(row - centerRow, col - centerCol) * stagger;

      case "ripple-in":
        const maxDist = Math.hypot(centerRow, centerCol);
        return (
          (maxDist - Math.hypot(row - centerRow, col - centerCol)) * stagger
        );

      case "random":
        return Math.random() * stagger * 10; // adjust multiplier if needed

      case "diag-tl":
        return (row + col) * stagger;

      case "diag-tr":
        return (row + (numCols - col)) * stagger;

      case "diag-br":
        return (numRows - row + (numCols - col)) * stagger;

      case "diag-bl":
        return (numRows - row + col) * stagger;

      default:
        return row * stagger; // fallback to stack-top
    }
  }

  function revealAllGridSquares({
    animation = "stack-top",
    stagger = 50,
  } = {}) {
    const now = Date.now();

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const delay = getRevealDelay(row, col, { animation, stagger });

        allNeighbors.push({
          row,
          col,
          opacity: 0,
          fadingIn: false,
          revealDelay: now + delay,
        });
      }
    }
  }

  const fadeOut = (animation = "stack-bottom", stagger = 50) => {
    const now = Date.now();

    for (const neighbor of allNeighbors) {
      const delay = getRevealDelay(neighbor.row, neighbor.col, {
        animation,
        stagger,
      });

      neighbor.fadingIn = false;
      neighbor.revealDelay = null; // cancel any pending reveals
      neighbor.fadeOutDelay = now + delay;
    }
  };

  document.querySelectorAll(".grid-show").forEach((el) => {
    const enter = el.dataset.gridEnter || "stack-top";
    const exit = el.dataset.gridExit || "stack-top";
    const stagger = parseInt(el.dataset.gridStagger) || 50;

    ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom 75%",
      onEnter: () => {
        freezeGridFade = true;
        revealAllGridSquares({ animation: enter, stagger });
      },
      onEnterBack: () => {
        freezeGridFade = true;
        revealAllGridSquares({ animation: enter, stagger });
      },
      onLeave: () => {
        freezeGridFade = false;
        fadeOut(exit, stagger);
      },
      onLeaveBack: () => {
        freezeGridFade = false;
        fadeOut(exit, stagger);
      },
    });
  });
}
