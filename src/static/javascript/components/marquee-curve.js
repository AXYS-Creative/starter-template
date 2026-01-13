class MarqueeCurve {
  constructor(element) {
    this.element = element;
    this.track = element.querySelector(".marquee-curve__track");
    this.contents = Array.from(element.querySelectorAll(".marquee-curve__content"));
    this.svg = element.querySelector(".marquee-curve__path");
    this.path = element.querySelector(".marquee-curve__curve");

    const curveString = element.dataset.curve || "";
    this.curveData = this.parseCurve(curveString);
    this.spacing = Number.parseFloat(element.dataset.spacing || "1");
    this.reverse = element.dataset.reverse !== "true";

    // Scrub intensity:
    // - attribute absent => intensity 0 (autoplay only)
    // - attribute present but empty => intensity 1
    // - attribute present with numeric => clamp 0..1
    this.scrubIntensity = this.parseScrubIntensity();

    this.animationFrame = null;

    // Two tracks: autoplay offset and rendered offset
    this.offset = 0; // rendered offset
    this._autoOffset = 0; // time-based driver

    this.speed = Number.parseFloat(element.dataset.speed || "60"); // px/s

    this.contentRuns = [];

    this.pathLength = 0;
    this.lut = null;
    this.lutSamples = Number.parseInt(element.dataset.samples || "900", 10);

    this._resizeRaf = null;
    this._isActive = true;
    this._io = null;

    this._scrollRaf = null;
    this._scrubProgress = 0; // 0-1
    this._scrubOffset = 0; // computed from scroll

    this.init();
  }

  parseScrubIntensity() {
    // Attribute might be present as:
    // - data-marquee-scrub           (empty string)
    // - data-marquee-scrub="0.5"
    // - absent
    if (!this.element.hasAttribute("data-scrub")) return 0;

    const raw = this.element.getAttribute("data-scrub");

    // If present but empty, treat as full scrub
    if (raw === "" || raw === null) return 1;

    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) return 1;

    // Clamp 0..1
    return Math.max(0, Math.min(1, n));
  }

  parseCurve(curveString) {
    const matches = curveString.match(
      /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i
    );

    if (!matches) {
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

      // Only attach scroll listener if scrub has any influence
      if (this.scrubIntensity > 0) {
        this.setupScrollScrub();
      }

      this.animate(performance.now());
    });
  }

  setupResize() {
    window.addEventListener(
      "resize",
      () => {
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
    if (!("IntersectionObserver" in window)) return;

    this._io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this._isActive = !!entry?.isIntersecting;
      },
      { root: null, threshold: 0.01 }
    );

    this._io.observe(this.element);
  }

  setupScrollScrub() {
    window.addEventListener(
      "scroll",
      () => {
        if (this._scrollRaf) return;
        this._scrollRaf = requestAnimationFrame(() => {
          this._scrollRaf = null;
          this.updateScrubProgress();
        });
      },
      { passive: true }
    );

    this.updateScrubProgress();
  }

  updateScrubProgress() {
    if (!this.pathLength) return;

    const rect = this.element.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const start = vh;
    const end = -rect.height;
    const range = start - end;

    let p = 0;
    if (range > 0) p = (start - rect.top) / range;

    p = Math.max(0, Math.min(1, p));

    const wrap = this.pathLength * 2;

    this._scrubProgress = p;
    this._scrubOffset = p * wrap;
  }

  rebuildAll() {
    const firstContent = this.contents[0];
    const rawText = (firstContent?.textContent || "").trim();
    if (!rawText) return;

    const monoW = this.getMonoCharWidthFromContent(firstContent);
    const K = 1.25;

    const charSpacing = Math.max(1, monoW * K * this.spacing);

    const charsCount = Array.from(rawText).length;
    const runLength = charsCount * charSpacing;

    const minWidth = this.element.getBoundingClientRect().width;

    const buffer = monoW * 8;
    const curveWidth = Math.ceil(Math.max(minWidth, runLength + buffer));

    this.applyGeometry(curveWidth);
    this.createCurvePath(curveWidth);
    if (!this.pathLength) return;

    this.positionTextOnCurve(charSpacing);
    this.buildPathLookupTable();

    // After rebuild, scrub mapping depends on pathLength; refresh it
    if (this.scrubIntensity > 0) {
      this.updateScrubProgress();
      // Keep continuity: align both drivers to current rendered offset
      const wrap = this.pathLength * 2;
      this._autoOffset = ((this._autoOffset % wrap) + wrap) % wrap;
      this.offset = ((this.offset % wrap) + wrap) % wrap;
    }
  }

  createCurvePath(curveWidth) {
    const width = curveWidth;
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

  applyGeometry(curveWidthPx) {
    this.track.style.width = `${curveWidthPx * 2}px`;
    this.svg.style.width = `${curveWidthPx}px`;

    this.contents.forEach((content, i) => {
      content.style.width = `${curveWidthPx}px`;
      content.style.left = `${i * curveWidthPx}px`;
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

      this.contentRuns.push({
        spans,
        offsets,
        baseOffset: contentIndex * this.pathLength,
      });
    }
  }

  buildPathLookupTable() {
    const count = Math.max(50, this.lutSamples | 0);
    const points = new Float32Array(count * 2);
    const angles = new Float32Array(count);

    const len = this.pathLength;
    const step = len / (count - 1);

    for (let i = 0; i < count; i++) {
      const d = i * step;
      const p = this.path.getPointAtLength(d);
      points[i * 2] = p.x;
      points[i * 2 + 1] = p.y;
    }

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

  getPointAndAngleAtDistance(distance) {
    const { points, angles, count, step, len } = this.lut;

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

    const a0 = angles[i0];
    const a1 = angles[i1];
    const angle = a0 + (a1 - a0) * t;

    return { x, y, angle };
  }

  updateCharacterPositions() {
    if (!this.lut || !this.pathLength) return;

    const directionMultiplier = this.reverse ? -1 : 1;
    const wrapLength = this.pathLength * 2;

    for (let r = 0; r < this.contentRuns.length; r++) {
      const run = this.contentRuns[r];
      const spans = run.spans;
      const offsets = run.offsets;
      const baseOffset = run.baseOffset;

      for (let i = 0; i < spans.length; i++) {
        let totalOffset = baseOffset + offsets[i] + this.offset * directionMultiplier;

        totalOffset = ((totalOffset % wrapLength) + wrapLength) % wrapLength;

        const distance = totalOffset % this.pathLength;
        const { x, y, angle } = this.getPointAndAngleAtDistance(distance);

        spans[i].style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`;
      }
    }
  }

  animate(now) {
    if (!this._lastTime) this._lastTime = now;
    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    if (this._isActive) {
      const wrap = this.pathLength * 2;

      // Advance autoplay driver regardless (for blending)
      if (wrap > 0) {
        this._autoOffset += this.speed * dt;
        this._autoOffset = ((this._autoOffset % wrap) + wrap) % wrap;
      }

      // Compute blended target between autoplay and scrub
      const intensity = this.scrubIntensity; // 0..1
      let target = this._autoOffset;

      if (intensity > 0 && wrap > 0) {
        // Ensure scrub offset is current (in case scroll hasn't fired yet)
        // This is cheap: no DOM read, just uses cached value.
        const scrubOffset = this._scrubOffset;

        // Blend: auto + intensity*(scrub - auto)
        target = this._autoOffset + intensity * (scrubOffset - this._autoOffset);

        // Wrap target to keep it bounded
        target = ((target % wrap) + wrap) % wrap;
      }

      // Smooth follow (keeps motion fluid)
      const alpha = 0.12;
      this.offset += (target - this.offset) * alpha;

      if (wrap > 0) {
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
