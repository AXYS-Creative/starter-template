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
    this.updateBounds();
    this.createDots();
    this.bindEvents();
    this.startMouseSpeed();
    this.tick();
  }

  updateBounds() {
    const rect = this.svg.getBoundingClientRect();
    this.svgBounds = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }

  createDots() {
    // Get all shape elements
    const shapes = this.svg.querySelectorAll(
      "circle, rect, path, polygon, ellipse, line, polyline"
    );
    if (shapes.length === 0) return;

    // Clear existing dots
    this.svg.querySelectorAll(".dot-fill-dot").forEach((dot) => dot.remove());
    this.dots = [];

    // Get the combined bounding box of all shapes in viewBox coordinates
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    shapes.forEach((shape) => {
      const bbox = shape.getBBox();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    });

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
          };

          dot.el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.el.setAttribute("cx", x);
          dot.el.setAttribute("cy", y);
          dot.el.setAttribute("r", this.config.radius);
          dot.el.setAttribute("fill", this.config.color);
          dot.el.classList.add("dot-fill-dot");

          this.svg.appendChild(dot.el);
          this.dots.push(dot);
        }
      }
    }

    // Hide original shapes
    shapes.forEach((shape) => (shape.style.opacity = "0"));
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

    this.handleResize = () => {
      this.updateBounds();
    };

    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("resize", this.handleResize);
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
    this.dots.forEach((dot) => {
      // Convert mouse page coordinates to SVG viewBox coordinates
      const viewBox = this.svg.viewBox.baseVal;
      const scaleX = viewBox.width / this.svgBounds.width;
      const scaleY = viewBox.height / this.svgBounds.height;

      const mouseXInSVG = (this.mouse.x - this.svgBounds.x) * scaleX + viewBox.x;
      const mouseYInSVG = (this.mouse.y - this.svgBounds.y) * scaleY + viewBox.y;

      const distX = mouseXInSVG - dot.position.x;
      const distY = mouseYInSVG - dot.position.y;
      const dist = Math.max(Math.hypot(distX, distY), 1);

      // Shared intensity calculation
      const minIntensity = 0.25;
      let intensity = 1 - dist / this.config.distance;
      intensity = Math.min(Math.max(intensity, 0), 1);
      intensity = minIntensity + intensity * (1 - minIntensity);

      // Illuminate effect
      if (this.config.illuminate) {
        dot.el.style.opacity = intensity;
      }

      // Grow effect
      if (this.config.grow > 0) {
        dot.el.setAttribute("r", this.config.radius * (1 + intensity * this.config.grow));
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

      dot.el.setAttribute("cx", dot.smooth.x);
      dot.el.setAttribute("cy", dot.smooth.y);
    });

    this.animationFrame = requestAnimationFrame(() => this.tick());
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("resize", this.handleResize);
  }
}

// Initialize all dot-fill SVGs
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".dot-fill").forEach((svg) => {
    const dotFill = new DotFill(svg);
    dotFill.init();
  });
});
