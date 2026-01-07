class MarqueeCurve {
  constructor(element) {
    this.element = element;
    this.track = element.querySelector(".marquee-curve__track");
    this.contents = Array.from(element.querySelectorAll(".marquee-curve__content"));
    this.svg = element.querySelector(".marquee-curve__path");
    this.path = element.querySelector(".marquee-curve__curve");

    // Data
    const curveString = element.dataset.curve || "";
    this.curveData = this.parseCurve(curveString);
    this.spacing = Number.parseFloat(element.dataset.spacing || "1");
    this.reverse = element.dataset.reverse === "true";

    // Animation
    this.animationFrame = null;
    this.offset = 0;

    // Interpret "speed" as pixels per second to normalize across refresh rates
    this.speed = Number.parseFloat(element.dataset.speed || "60"); // default 60px/s

    // Cached character structures:
    // [
    //   { spans: [HTMLElement...], offsets: [number...], baseOffset: number }
    // ]
    this.contentRuns = [];

    // Path lookup table
    this.pathLength = 0;
    this.lut = null; // { points: Float32Array, angles: Float32Array, count: number }
    this.lutSamples = Number.parseInt(element.dataset.samples || "900", 10); // tune: 600-1500

    // Resize handling
    this._resizeRaf = null;

    // Visibility handling (optional)
    this._isActive = true;
    this._io = null;

    this.init();
  }

  parseCurve(curveString) {
    // Accept: cubic-bezier(x1, y1, x2, y2)
    const matches = curveString.match(
      /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i
    );

    if (!matches) {
      // Default: flat-ish across midline (your earlier preference)
      return { x1: 0.33, y1: 0.5, x2: 0.67, y2: 0.5 };
    }

    return {
      x1: Number.parseFloat(matches[1]),
      y1: Number.parseFloat(matches[2]),
      x2: Number.parseFloat(matches[3]),
      y2: Number.parseFloat(matches[4]),
    };
  }

  init() {
    requestAnimationFrame(() => {
      this.rebuildAll();
      this.setupResize();
      this.setupResizeObserver();
      this.setupVisibilityHandling();

      if (document.fonts?.ready) {
        document.fonts.ready.then(() => this.rebuildAll());
      }

      this.animate(performance.now());
    });
  }

  setupResize() {
    window.addEventListener(
      "resize",
      () => {
        // Coalesce multiple resize events into a single rebuild
        if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
        this._resizeRaf = requestAnimationFrame(() => {
          this.rebuildAll();
        });
      },
      { passive: true }
    );
  }

  setupResizeObserver() {
    if (!("ResizeObserver" in window)) return;

    this._ro = new ResizeObserver(() => {
      if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = requestAnimationFrame(() => this.rebuildAll());
    });

    this._ro.observe(this.track);
  }

  setupVisibilityHandling() {
    // If you don’t want this behavior, remove this method + calls, or force _isActive = true.
    if (!("IntersectionObserver" in window)) return;

    this._io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this._isActive = !!entry?.isIntersecting;
      },
      {
        root: null,
        threshold: 0.01,
      }
    );

    this._io.observe(this.element);
  }

  rebuildAll() {
    // Need a content node to measure font size (monospace glyph width)
    const firstContent = this.contents[0];
    const rawText = (firstContent?.textContent || "").trim();
    if (!rawText) return;

    // Monospace width (px) and derived spacing
    const monoW = this.getMonoCharWidthFromContent(firstContent);

    // Conservative multiplier to avoid collisions on curves
    const K = 1.25;

    // Your data-spacing can remain a multiplier; if you want "spacing=1" to mean
    // "natural mono spacing", keep it in the formula:
    const charSpacing = Math.max(1, monoW * K * this.spacing);

    // How much arc-length the text wants (px-ish)
    const charsCount = Array.from(rawText).length;
    const runLength = charsCount * charSpacing;

    // Minimum width should at least cover the visible container so you don't shrink on desktop
    const minWidth = this.element.getBoundingClientRect().width;

    // This is the key: make the curve long enough for the string (plus a small buffer)
    const buffer = monoW * 8; // ~8 chars of padding
    const curveWidth = Math.ceil(Math.max(minWidth, runLength + buffer));

    // Apply geometry so track/content/svg match this curve width
    this.applyGeometry(curveWidth);

    // Now build curve based on that width and current height
    this.createCurvePath(curveWidth);

    if (!this.pathLength) return;

    // Place text using our charSpacing (so it remains stable and non-overlapping)
    this.positionTextOnCurve(charSpacing);

    // LUT rebuild
    this.buildPathLookupTable();
  }

  createCurvePath(curveWidth) {
    const width = curveWidth; // <-- explicit
    const height = this.track.offsetHeight;

    if (!width || !height) return;

    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const { x1, y1, x2, y2 } = this.curveData;

    const startX = 0;
    const startY = height / 2;
    const endX = width;
    const endY = height / 2;

    const cp1X = width * x1;
    const cp2X = width * x2;

    const midY = height / 2;
    const amp = height / 2;

    const cp1Y = midY - amp * (y1 - 0.5) * 2;
    const cp2Y = midY - amp * (y2 - 0.5) * 2;

    const pathData = `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;
    this.path.setAttribute("d", pathData);

    this.pathLength = this.path.getTotalLength();
  }

  getMonoCharWidthFromContent(content) {
    const probe = document.createElement("span");
    probe.textContent = "M";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    probe.style.pointerEvents = "none";
    content.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w || 0;
  }

  // Sets track/svg/content widths so the curve is long enough for the text.
  // This prevents modulo-wrap overlap.
  applyGeometry(curveWidthPx) {
    // Track is 2× so we have room for original + clone
    this.track.style.width = `${curveWidthPx * 2}px`;

    // SVG should match curve width in CSS px so getPointAtLength coordinates
    // align with what you're translating spans to.
    this.svg.style.width = `${curveWidthPx}px`;

    // Each content run occupies exactly one curve width
    this.contents.forEach((content, i) => {
      content.style.width = `${curveWidthPx}px`;
      content.style.left = `${i * curveWidthPx}px`; // 0 for first, curveWidth for clone
    });
  }

  positionTextOnCurve(charSpacing) {
    this.contentRuns = [];

    for (let contentIndex = 0; contentIndex < this.contents.length; contentIndex++) {
      const content = this.contents[contentIndex];
      const text = (content.textContent || "").trim();
      if (!text) continue;

      const chars = Array.from(text);
      content.textContent = "";

      const fragment = document.createDocumentFragment();
      const spans = new Array(chars.length);
      const offsets = new Float32Array(chars.length);

      for (let i = 0; i < chars.length; i++) {
        const span = document.createElement("span");
        span.textContent = chars[i];
        span.style.position = "absolute";
        span.style.transformOrigin = "center center";
        span.style.willChange = "transform";
        spans[i] = span;
        offsets[i] = i * charSpacing;
        fragment.appendChild(span);
      }

      content.appendChild(fragment);

      // IMPORTANT: offset clone by curve width, not path length.
      // Because we geometry-sized the curve, curve width == one full run region.
      // We can use pathLength here too, but curveWidth-based layout is what prevents stacking.
      this.contentRuns.push({
        spans,
        offsets,
        baseOffset: contentIndex * this.pathLength, // safe now because path is long enough
      });
    }
  }

  buildPathLookupTable() {
    // Precompute points/angles along the path at evenly spaced arc-length intervals.
    // Each entry is [x,y] and an angle in radians.
    const count = Math.max(50, this.lutSamples | 0);
    const points = new Float32Array(count * 2);
    const angles = new Float32Array(count);

    const len = this.pathLength;
    const step = len / (count - 1);

    // Compute points
    for (let i = 0; i < count; i++) {
      const d = i * step;
      const p = this.path.getPointAtLength(d);
      points[i * 2] = p.x;
      points[i * 2 + 1] = p.y;
    }

    // Compute angles from forward differences
    for (let i = 0; i < count - 1; i++) {
      const x1 = points[i * 2];
      const y1 = points[i * 2 + 1];
      const x2 = points[(i + 1) * 2];
      const y2 = points[(i + 1) * 2 + 1];
      angles[i] = Math.atan2(y2 - y1, x2 - x1);
    }
    angles[count - 1] = angles[count - 2] || 0;

    this.lut = { points, angles, count, step, len };
  }

  // Fast LUT lookup with linear interpolation
  getPointAndAngleAtDistance(distance) {
    const { points, angles, count, step, len } = this.lut;

    // Wrap [0, len)
    let d = distance % len;
    if (d < 0) d += len;

    const idx = d / step;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, count - 1);
    const t = idx - i0;

    const x0 = points[i0 * 2];
    const y0 = points[i0 * 2 + 1];
    const x1 = points[i1 * 2];
    const y1 = points[i1 * 2 + 1];

    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;

    // Angle interpolation is usually fine “as is” for small step sizes
    const a0 = angles[i0];
    const a1 = angles[i1];
    const angle = a0 + (a1 - a0) * t;

    return { x, y, angle };
  }

  updateCharacterPositions() {
    if (!this.lut || !this.pathLength) return;

    const directionMultiplier = this.reverse ? -1 : 1;

    // Wrapping logic: you used wrapLength = pathLength * 2
    // Keep it to preserve the “two loops” behavior.
    const wrapLength = this.pathLength * 2;

    for (let r = 0; r < this.contentRuns.length; r++) {
      const run = this.contentRuns[r];
      const spans = run.spans;
      const offsets = run.offsets;

      const baseOffset = run.baseOffset;

      for (let i = 0; i < spans.length; i++) {
        let totalOffset = baseOffset + offsets[i] + this.offset * directionMultiplier;

        // Wrap into [0, wrapLength)
        totalOffset = ((totalOffset % wrapLength) + wrapLength) % wrapLength;

        const distance = totalOffset % this.pathLength;

        const { x, y, angle } = this.getPointAndAngleAtDistance(distance);

        // translate3d tends to behave better for compositing; keep rotation in radians
        spans[i].style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`;
      }
    }
  }

  animate(now) {
    if (!this._lastTime) this._lastTime = now;
    const dt = (now - this._lastTime) / 1000; // seconds
    this._lastTime = now;

    if (this._isActive) {
      this.offset += this.speed * dt;

      const wrap = this.pathLength * 2;
      if (wrap > 0) {
        // Keep offset bounded to avoid float growth
        this.offset = ((this.offset % wrap) + wrap) % wrap;
      }

      this.updateCharacterPositions();
    }

    this.animationFrame = requestAnimationFrame((t) => this.animate(t));
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;

    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }

    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }
  }
}

// Initialize all marquee curves
document.addEventListener("DOMContentLoaded", () => {
  const marquees = document.querySelectorAll(".marquee-curve");
  marquees.forEach((marquee) => {
    new MarqueeCurve(marquee);
  });
});
