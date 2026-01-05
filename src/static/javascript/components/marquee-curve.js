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
    // Build once layout has settled
    requestAnimationFrame(() => {
      this.rebuildAll();
      this.setupResize();
      this.setupVisibilityHandling();
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
    this.createCurvePath();
    if (!this.pathLength) return;

    this.positionTextOnCurve(); // builds DOM + caches spans/offsets
    this.buildPathLookupTable(); // expensive once, cheap thereafter
  }

  createCurvePath() {
    const width = this.track.offsetWidth / 2;
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

    // Map y control points around midline (0.5 is center)
    const midY = height / 2;
    const amp = height / 2;

    const cp1Y = midY - amp * (y1 - 0.5) * 2;
    const cp2Y = midY - amp * (y2 - 0.5) * 2;

    const pathData = `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;
    this.path.setAttribute("d", pathData);

    // Cache length
    this.pathLength = this.path.getTotalLength();
  }

  positionTextOnCurve() {
    this.contentRuns = [];

    for (let contentIndex = 0; contentIndex < this.contents.length; contentIndex++) {
      const content = this.contents[contentIndex];
      const text = (content.textContent || "").trim();
      if (!text) continue;

      const chars = Array.from(text); // handles unicode better than split("")
      content.textContent = "";

      const fragment = document.createDocumentFragment();

      // Your original intent:
      // pathLength / chars.length gives "natural" distribution, then scaled by spacing.
      // Keep the behavior but clamp pathological cases.
      const perChar = this.pathLength / Math.max(chars.length, 1);
      const charSpacing = perChar * this.spacing;

      const spans = new Array(chars.length);
      const offsets = new Float32Array(chars.length);

      for (let i = 0; i < chars.length; i++) {
        const span = document.createElement("span");
        span.textContent = chars[i];

        // Set once; avoid touching these every frame
        span.style.position = "absolute";
        span.style.transformOrigin = "center center";
        span.style.willChange = "transform";

        const off = i * charSpacing;

        spans[i] = span;
        offsets[i] = off;

        fragment.appendChild(span);
      }

      content.appendChild(fragment);

      this.contentRuns.push({
        spans,
        offsets,
        baseOffset: contentIndex * this.pathLength,
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

    window.removeEventListener("resize", this._onResize);

    if (this._io) {
      this._io.disconnect();
      this._io = null;
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
