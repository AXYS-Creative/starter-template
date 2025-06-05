// Grid effect, requires canvas in html
(() => {
  const CELL_SIZE = 64;
  const STROKE_COLOR_HEX = "#1e1e1e";
  const STARTING_ALPHA = 255;
  const BACKGROUND_COLOR = "#101010";
  const PROB_OF_NEIGHBOR = 0.5;
  const AMT_FADE_PER_FRAME = 5;
  const STROKE_WIDTH = 1;
  const SHOW_HOVERED_CELL = false;

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

    allNeighbors = allNeighbors.filter((neighbor) => {
      neighbor.opacity = Math.max(0, neighbor.opacity - AMT_FADE_PER_FRAME);
      if (neighbor.opacity > 0) {
        const x = neighbor.col * CELL_SIZE;
        const y = neighbor.row * CELL_SIZE;
        const alpha = neighbor.opacity / 255;
        ctx.strokeStyle = hexToRgba(STROKE_COLOR_HEX, neighbor.opacity / 255);
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        return true;
      }
      return false;
    });

    requestAnimationFrame(draw);
  }

  draw();
})();
