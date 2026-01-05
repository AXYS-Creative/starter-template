class MarqueeCurve {
  constructor(element) {
    this.element = element;
    this.track = element.querySelector(".marquee-curve__track");
    this.contents = element.querySelectorAll(".marquee-curve__content");
    this.svg = element.querySelector(".marquee-curve__path");
    this.path = element.querySelector(".marquee-curve__curve");

    const curveString = element.dataset.curve;
    this.curveData = this.parseCurve(curveString);
    this.spacing = parseFloat(element.dataset.spacing);
    this.reverse = element.dataset.reverse === "true";

    this.animationFrame = null;
    this.offset = 0;
    this.speed = 1;

    this.init();
  }

  parseCurve(curveString) {
    const matches = curveString.match(
      /cubic-bezier\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/
    );
    if (!matches) {
      return { x1: 0.33, y1: 0.5, x2: 0.67, y2: 0.5 };
    }
    return {
      x1: parseFloat(matches[1]),
      y1: parseFloat(matches[2]),
      x2: parseFloat(matches[3]),
      y2: parseFloat(matches[4]),
    };
  }

  init() {
    setTimeout(() => {
      this.createCurvePath();
      this.positionTextOnCurve();
      this.animate();
    }, 100);

    window.addEventListener("resize", () => {
      this.createCurvePath();
      this.positionTextOnCurve();
    });
  }

  createCurvePath() {
    const width = this.track.offsetWidth / 2;
    const height = this.track.offsetHeight;

    if (width === 0 || height === 0) {
      return;
    }

    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const { x1, y1, x2, y2 } = this.curveData;

    const startX = 0;
    const startY = height / 2;
    const endX = width;
    const endY = height / 2;

    const cp1X = width * x1;
    const cp1Y = height / 2 - (height / 2) * (y1 - 0.5) * 2;
    const cp2X = width * x2;
    const cp2Y = height / 2 - (height / 2) * (y2 - 0.5) * 2;

    const pathData = `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;

    this.path.setAttribute("d", pathData);
    this.pathLength = this.path.getTotalLength();
  }

  positionTextOnCurve() {
    this.contents.forEach((content) => {
      const text = content.textContent.trim();

      if (!text) {
        return;
      }

      const chars = text.split("");
      content.innerHTML = "";

      const charSpacing = (this.pathLength / chars.length) * this.spacing;

      chars.forEach((char, index) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.position = "absolute";
        span.style.transformOrigin = "center center";
        span.dataset.index = index;
        span.dataset.offset = index * charSpacing;
        content.appendChild(span);
      });
    });
  }

  updateCharacterPositions() {
    this.contents.forEach((content, contentIndex) => {
      const spans = content.querySelectorAll("span");
      const baseOffset = contentIndex * this.pathLength;

      spans.forEach((span) => {
        const charOffset = parseFloat(span.dataset.offset);

        // Simply reverse the offset direction without flipping rotation
        const directionMultiplier = this.reverse ? -1 : 1;
        let totalOffset = baseOffset + charOffset + this.offset * directionMultiplier;

        // Ensure proper wrapping for both directions
        const wrapLength = this.pathLength * 2;
        totalOffset = ((totalOffset % wrapLength) + wrapLength) % wrapLength;

        const distance = totalOffset % this.pathLength;

        try {
          const point = this.path.getPointAtLength(distance);
          const tangentDistance = Math.min(distance + 1, this.pathLength);
          const tangentPoint = this.path.getPointAtLength(tangentDistance);
          const angle = Math.atan2(tangentPoint.y - point.y, tangentPoint.x - point.x);

          span.style.transform = `translate(${point.x}px, ${point.y}px) rotate(${angle}rad)`;
        } catch (e) {
          // Silent fail for edge cases
        }
      });
    });
  }

  animate() {
    this.offset += this.speed;
    if (this.offset >= this.pathLength * 2) {
      this.offset = 0;
    }

    this.updateCharacterPositions();
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
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
