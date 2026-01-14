const gridCanvas = document.getElementById("grid-bg");

if (gridCanvas) {
  const CELL_SIZE = 48;
  const STROKE_COLOR_HEX = "#3d3d3d";
  const STARTING_ALPHA = 255;
  const BACKGROUND_COLOR = "#101010";
  const PROB_OF_NEIGHBOR = 0.5;
  const AMT_FADE_PER_SECOND = 300;
  const STROKE_WIDTH = 1;
  const SHOW_HOVERED_CELL = false;
  const TOUCH_INTERVAL_MS = 7500;
  const MAX_DPR = 2;

  let freezeGridFade = false;
  let bgDisabled = false;
  let gridHidden = false;

  const canvas = gridCanvas;
  const ctx = canvas.getContext("2d", { alpha: false });

  const STROKE_RGB = (() => {
    const r = parseInt(STROKE_COLOR_HEX.slice(1, 3), 16);
    const g = parseInt(STROKE_COLOR_HEX.slice(3, 5), 16);
    const b = parseInt(STROKE_COLOR_HEX.slice(5, 7), 16);
    return { r, g, b };
  })();

  const strokeStyleCache = new Array(256);
  const getStrokeStyle = (opacity) => {
    const o = Math.max(0, Math.min(255, opacity | 0));
    let s = strokeStyleCache[o];
    if (!s) {
      s = `rgba(${STROKE_RGB.r},${STROKE_RGB.g},${STROKE_RGB.b},${o / 255})`;
      strokeStyleCache[o] = s;
    }
    return s;
  };

  let width = 0;
  let height = 0;
  let numRows = 0;
  let numCols = 0;

  const cells = new Map();
  const keyFor = (row, col) => row * numCols + col;

  const upsertCell = (row, col, patch) => {
    const key = keyFor(row, col);
    const existing = cells.get(key);
    if (existing) {
      Object.assign(existing, patch);
      return existing;
    }
    const next = {
      row,
      col,
      opacity: 0,
      fadingIn: false,
      revealDelay: null,
      fadeOutDelay: null,
      ...patch,
    };
    cells.set(key, next);
    return next;
  };

  const resizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    numRows = Math.ceil(height / CELL_SIZE);
    numCols = Math.ceil(width / CELL_SIZE);

    const prune = [];
    for (const [key, cell] of cells) {
      if (cell.row >= numRows || cell.col >= numCols) prune.push(key);
    }
    for (const key of prune) cells.delete(key);

    ctx.lineWidth = STROKE_WIDTH;
    ctx.fillStyle = BACKGROUND_COLOR;
  };

  resizeCanvas();

  let resizeTimeout;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 100);
    },
    { passive: true }
  );

  document.querySelectorAll(".grid-bg-disable").forEach((el) => {
    el.addEventListener("pointerenter", () => (bgDisabled = true), { passive: true });
    el.addEventListener("pointerleave", () => (bgDisabled = false), { passive: true });
  });

  document.querySelectorAll(".grid-bg-hide").forEach((el) => {
    el.addEventListener("pointerenter", () => (gridHidden = true), { passive: true });
    el.addEventListener("pointerleave", () => (gridHidden = false), { passive: true });
  });

  let pointerX = -1;
  let pointerY = -1;
  let pointerDirty = false;

  window.addEventListener(
    "pointermove",
    (e) => {
      if (bgDisabled || gridHidden) {
        pointerX = -1;
        pointerY = -1;
        pointerDirty = true;
        return;
      }
      pointerX = e.clientX;
      pointerY = e.clientY;
      pointerDirty = true;
    },
    { passive: true }
  );

  let currentRow = -1;
  let currentCol = -1;

  const activateRandomNeighbors = (row, col) => {
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        const r = row + dRow;
        const c = col + dCol;
        if (r < 0 || r >= numRows || c < 0 || c >= numCols) continue;
        if (Math.random() >= PROB_OF_NEIGHBOR) continue;

        upsertCell(r, c, {
          opacity: STARTING_ALPHA,
          fadingIn: false,
          revealDelay: null,
          fadeOutDelay: null,
        });
      }
    }
  };

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
      case "ripple-in": {
        const maxDist = Math.hypot(centerRow, centerCol);
        return (maxDist - Math.hypot(row - centerRow, col - centerCol)) * stagger;
      }
      case "random":
        return Math.random() * stagger * 10;
      case "diag-tl":
        return (row + col) * stagger;
      case "diag-tr":
        return row + (numCols - col) * stagger;
      case "diag-br":
        return (numRows - row + (numCols - col)) * stagger;
      case "diag-bl":
        return (numRows - row + col) * stagger;
      default:
        return row * stagger;
    }
  }

  function revealAllGridSquares({ animation = "stack-top", stagger = 50 } = {}) {
    if (gridHidden) return;
    const now = performance.now();

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const key = keyFor(row, col);
        const existing = cells.get(key);
        if (
          existing &&
          existing.opacity >= STARTING_ALPHA &&
          !existing.fadeOutDelay &&
          !existing.revealDelay
        )
          continue;

        const delay = getRevealDelay(row, col, { animation, stagger });
        upsertCell(row, col, {
          opacity: existing ? existing.opacity : 0,
          fadingIn: false,
          revealDelay: now + delay,
          fadeOutDelay: null,
        });
      }
    }
  }

  const fadeOut = (animation = "stack-bottom", stagger = 50) => {
    const now = performance.now();
    for (const cell of cells.values()) {
      const delay = getRevealDelay(cell.row, cell.col, { animation, stagger });
      cell.fadingIn = false;
      cell.revealDelay = null;
      cell.fadeOutDelay = now + delay;
    }
  };

  let lastFrameTime = performance.now();

  function draw(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    ctx.fillRect(0, 0, width, height);

    if (gridHidden) {
      cells.clear();
      currentRow = -1;
      currentCol = -1;
      requestAnimationFrame(draw);
      return;
    }

    if (pointerDirty) {
      pointerDirty = false;
      if (pointerX >= 0 && pointerY >= 0) {
        const row = Math.floor(pointerY / CELL_SIZE);
        const col = Math.floor(pointerX / CELL_SIZE);
        if (row !== currentRow || col !== currentCol) {
          currentRow = row;
          currentCol = col;
          activateRandomNeighbors(row, col);
        }
      } else {
        currentRow = -1;
        currentCol = -1;
      }
    }

    if (SHOW_HOVERED_CELL && currentRow >= 0 && currentCol >= 0) {
      ctx.strokeStyle = STROKE_COLOR_HEX;
      ctx.strokeRect(currentCol * CELL_SIZE, currentRow * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    const fadeAmt = AMT_FADE_PER_SECOND * dt;

    for (const [key, cell] of cells) {
      if (cell.revealDelay != null && now >= cell.revealDelay) {
        cell.fadingIn = true;
        cell.revealDelay = null;
      }

      if (cell.fadingIn) {
        cell.opacity += fadeAmt;
        if (cell.opacity >= STARTING_ALPHA) {
          cell.opacity = STARTING_ALPHA;
          cell.fadingIn = false;
        }
      } else if (!freezeGridFade) {
        if (cell.fadeOutDelay == null || now >= cell.fadeOutDelay) {
          cell.opacity = Math.max(0, cell.opacity - fadeAmt);
        }
      }

      ctx.strokeStyle = getStrokeStyle(cell.opacity);
      ctx.strokeRect(cell.col * CELL_SIZE, cell.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      if (cell.opacity <= 0 && cell.revealDelay == null) {
        cells.delete(key);
      }
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);

  function triggerAmbientGridLoop() {
    const animation = "random";
    const stagger = 100;

    setInterval(() => {
      if (!freezeGridFade && !gridHidden) {
        revealAllGridSquares({ animation, stagger });
      }
    }, TOUCH_INTERVAL_MS);
  }

  triggerAmbientGridLoop();

  document.querySelectorAll(".grid-show").forEach((el) => {
    const enter = el.dataset.gridEnter || "stack-top";
    const exit = el.dataset.gridExit || "stack-top";
    const stagger = parseInt(el.dataset.gridStagger, 10) || 50;

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
