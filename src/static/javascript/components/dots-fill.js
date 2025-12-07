class DotFill {
  constructor(svg) {
    this.svg = svg;

    // Configuration from data attributes
    this.config = {
      radius: parseFloat(svg.dataset.dotSize) || 1,
      gap: parseFloat(svg.dataset.dotGap) || 16,
      restore: parseFloat(svg.dataset.dotRestore) || 0.15,
      sensitivity: parseFloat(svg.dataset.dotSensitivity) || 0.95,
      distance: parseFloat(svg.dataset.dotDistance) || 50,
      strength: parseFloat(svg.dataset.dotStrength) || 10,
      color: this.resolveColor(svg.dataset.dotColor) || "#00ffff",
      illuminate: svg.dataset.dotIlluminate === "true",
      grow: parseFloat(svg.dataset.dotGrow) || 0,
    };

    this.dots = [];
    this.mouse = { x: 0, y: 0, prevX: 0, prevY: 0, speed: 0 };
    this.svgBounds = { x: 0, y: 0, width: 0, height: 0 };
    this.animationFrame = null;
    this.resizeObserver = null;

    // Cache viewBox values
    this.viewBoxCache = { width: 0, height: 0, x: 0, y: 0 };
  }

  resolveColor(color) {
    if (!color) return null;

    // Handle CSS variables
    if (color.startsWith("var(")) {
      const varName = color.match(/var\((--[^)]+)\)/)?.[1];
      if (varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      }
    }

    return color;
  }

  init() {
    // Set the color on the SVG element so circles can inherit it
    if (this.config.color) {
      this.svg.style.color = this.config.color;
    }
    this.cacheViewBox();
    this.updateBoundsThrottled();
    this.createDots();
    this.bindEvents();
    this.startMouseSpeed();
    this.tick();
  }

  cacheViewBox() {
    const viewBox = this.svg.viewBox.baseVal;
    this.viewBoxCache = {
      width: viewBox.width,
      height: viewBox.height,
      x: viewBox.x,
      y: viewBox.y,
    };
  }

  updateBoundsThrottled() {
    // Batch reads to avoid layout thrashing
    requestAnimationFrame(() => {
      const rect = this.svg.getBoundingClientRect();
      this.svgBounds = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    });
  }

  createDots() {
    // Get all shape elements
    const shapes = this.svg.querySelectorAll(
      "circle, rect, path, polygon, ellipse, line, polyline"
    );
    if (shapes.length === 0) return;

    // Clear existing dots
    this.svg.querySelectorAll(".dots-fill-dot").forEach((dot) => dot.remove());
    this.dots = [];

    // Batch all getBBox calls first to minimize reflows
    const bboxes = Array.from(shapes).map((shape) => shape.getBBox());

    // Get the combined bounding box of all shapes in viewBox coordinates
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    bboxes.forEach((bbox) => {
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    });

    // Use DocumentFragment for batch DOM insertion
    const fragment = document.createDocumentFragment();

    // Create dots within the shape
    for (let y = minY; y <= maxY; y += this.config.gap) {
      for (let x = minX; x <= maxX; x += this.config.gap) {
        // Check if point is inside ANY of the shapes
        let isInside = false;
        for (let shape of shapes) {
          if (this.isPointInShape(shape, x, y)) {
            isInside = true;
            break;
          }
        }

        if (isInside) {
          const dot = {
            anchor: { x, y },
            position: { x, y },
            smooth: { x, y },
            velocity: { x: 0, y: 0 },
            lastOpacity: 1,
            lastRadius: this.config.radius,
          };

          dot.el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.el.setAttribute("cx", x);
          dot.el.setAttribute("cy", y);
          dot.el.setAttribute("r", this.config.radius);
          dot.el.classList.add("dots-fill-dot");

          fragment.appendChild(dot.el);
          this.dots.push(dot);
        }
      }
    }

    // Single DOM operation instead of many
    this.svg.appendChild(fragment);

    // Hide original shapes (batch style changes)
    requestAnimationFrame(() => {
      shapes.forEach((shape) => (shape.style.opacity = "0"));
    });
  }

  isPointInShape(shape, x, y) {
    const point = this.svg.createSVGPoint();
    point.x = x;
    point.y = y;

    // For path elements, use isPointInFill
    if (shape.tagName === "path" || shape.tagName === "polygon") {
      return shape.isPointInFill(point);
    }

    // For circle
    if (shape.tagName === "circle") {
      const cx = parseFloat(shape.getAttribute("cx")) || 0;
      const cy = parseFloat(shape.getAttribute("cy")) || 0;
      const r = parseFloat(shape.getAttribute("r")) || 0;
      const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      return distance <= r;
    }

    // For rect
    if (shape.tagName === "rect") {
      const rx = parseFloat(shape.getAttribute("x")) || 0;
      const ry = parseFloat(shape.getAttribute("y")) || 0;
      const width = parseFloat(shape.getAttribute("width")) || 0;
      const height = parseFloat(shape.getAttribute("height")) || 0;
      return x >= rx && x <= rx + width && y >= ry && y <= ry + height;
    }

    // For ellipse
    if (shape.tagName === "ellipse") {
      const cx = parseFloat(shape.getAttribute("cx")) || 0;
      const cy = parseFloat(shape.getAttribute("cy")) || 0;
      const rx = parseFloat(shape.getAttribute("rx")) || 0;
      const ry = parseFloat(shape.getAttribute("ry")) || 0;
      return (x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1;
    }

    return false;
  }

  bindEvents() {
    this.handleMouseMove = (e) => {
      this.mouse.x = e.pageX;
      this.mouse.y = e.pageY;
    };

    // Use ResizeObserver instead of resize event for better performance
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateBoundsThrottled();
      });
      this.resizeObserver.observe(this.svg);
    } else {
      // Fallback to resize event with throttling
      let resizeTimeout;
      this.handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this.updateBoundsThrottled(), 100);
      };
      window.addEventListener("resize", this.handleResize);
    }

    window.addEventListener("mousemove", this.handleMouseMove, { passive: true });
  }

  startMouseSpeed() {
    const updateSpeed = () => {
      const distX = this.mouse.prevX - this.mouse.x;
      const distY = this.mouse.prevY - this.mouse.y;
      const dist = Math.hypot(distX, distY);

      // Reset speed if distance is abnormally large (likely a scroll/jump)
      if (dist > 200) {
        this.mouse.speed = 0;
        this.mouse.prevX = this.mouse.x;
        this.mouse.prevY = this.mouse.y;
        setTimeout(updateSpeed, 20);
        return;
      }

      this.mouse.speed += (dist - this.mouse.speed) * this.config.restore;
      if (this.mouse.speed < 0.001) this.mouse.speed = 0;

      this.mouse.prevX = this.mouse.x;
      this.mouse.prevY = this.mouse.y;

      setTimeout(updateSpeed, 20);
    };

    updateSpeed();
  }

  tick() {
    // Use cached viewBox values
    const scaleX = this.viewBoxCache.width / this.svgBounds.width;
    const scaleY = this.viewBoxCache.height / this.svgBounds.height;
    const mouseXInSVG = (this.mouse.x - this.svgBounds.x) * scaleX + this.viewBoxCache.x;
    const mouseYInSVG = (this.mouse.y - this.svgBounds.y) * scaleY + this.viewBoxCache.y;

    // Pre-calculate shared values
    const minIntensity = 0.25;
    const maxIntensity = 1 - minIntensity;

    this.dots.forEach((dot) => {
      const distX = mouseXInSVG - dot.position.x;
      const distY = mouseYInSVG - dot.position.y;
      const dist = Math.max(Math.hypot(distX, distY), 1);

      // Shared intensity calculation
      let intensity = 1 - dist / this.config.distance;
      intensity = Math.min(Math.max(intensity, 0), 1);
      intensity = minIntensity + intensity * maxIntensity;

      // Illuminate effect - only update if changed significantly
      if (this.config.illuminate) {
        const opacityDiff = Math.abs(dot.lastOpacity - intensity);
        if (opacityDiff > 0.01) {
          dot.el.style.opacity = intensity;
          dot.lastOpacity = intensity;
        }
      }

      // Grow effect - only update if changed significantly
      if (this.config.grow > 0) {
        const newRadius = this.config.radius * (1 + intensity * this.config.grow);
        const radiusDiff = Math.abs(dot.lastRadius - newRadius);
        if (radiusDiff > 0.1) {
          dot.el.setAttribute("r", newRadius);
          dot.lastRadius = newRadius;
        }
      }

      // Motion
      const angle = Math.atan2(distY, distX);
      const move = Math.min((this.config.strength / dist) * (this.mouse.speed * 0.1), 20);

      if (dist < this.config.distance) {
        dot.velocity.x += Math.cos(angle) * -move;
        dot.velocity.y += Math.sin(angle) * -move;
      }

      dot.velocity.x *= this.config.sensitivity;
      dot.velocity.y *= this.config.sensitivity;

      dot.position.x = dot.anchor.x + dot.velocity.x;
      dot.position.y = dot.anchor.y + dot.velocity.y;

      dot.smooth.x += (dot.position.x - dot.smooth.x) * 0.1;
      dot.smooth.y += (dot.position.y - dot.smooth.y) * 0.1;

      // Always update position (these are the main animation)
      dot.el.setAttribute("cx", dot.smooth.x);
      dot.el.setAttribute("cy", dot.smooth.y);
    });

    this.animationFrame = requestAnimationFrame(() => this.tick());
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener("mousemove", this.handleMouseMove);
    if (this.handleResize) {
      window.removeEventListener("resize", this.handleResize);
    }
  }
}

// Initialize all dots-fill SVGs
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".dots-fill").forEach((svg) => {
    const dotFill = new DotFill(svg);
    dotFill.init();
  });
});
