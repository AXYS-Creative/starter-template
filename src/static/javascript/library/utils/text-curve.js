class TextCurve {
  constructor(element) {
    this.element = element;
    this.text = element.textContent;
    this.targetCurveAmount = parseFloat(element.dataset.curveRadius) || 1;
    this.currentCurveAmount = this.targetCurveAmount;
    this.kerning = parseFloat(element.dataset.curveKerning) || 0;
    this.centered = element.hasAttribute("data-curve-centered");
    this.mouseCurve = element.hasAttribute("data-curve-mouse");
    this.isAnimating = false;
    this.init();

    if (this.mouseCurve) {
      this.setupMouseTracking();
    }
  }

  init() {
    const originalText = this.text;

    this.element.textContent = "";

    const chars = originalText.split("");
    const spans = chars.map((char) => {
      const span = document.createElement("span");

      span.textContent = char === " " ? "\u00A0" : char;
      this.element.appendChild(span);
      return span;
    });

    requestAnimationFrame(() => {
      this.positionCharacters(spans);
    });
  }

  setupMouseTracking() {
    const maxDistance = 300;

    const handleMouseMove = (e) => {
      const rect = this.element.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const mouseY = e.clientY;
      const distanceY = mouseY - centerY;

      const normalizedDistance = Math.max(-1, Math.min(1, distanceY / maxDistance));

      const interpolatedCurve = this.targetCurveAmount * normalizedDistance;

      this.animateToCurve(interpolatedCurve);
    };

    document.addEventListener("mousemove", handleMouseMove);
  }

  animateToCurve(newCurve) {
    this.currentCurveAmount = newCurve;

    const spans = Array.from(this.element.querySelectorAll("span"));
    requestAnimationFrame(() => {
      this.positionCharacters(spans);
    });
  }

  curveToRadius(curveAmount) {
    if (curveAmount === 0) return 999999;
    return 500 / Math.abs(curveAmount);
  }

  positionCharacters(spans) {
    const charCount = spans.length;

    let totalWidth = 0;
    spans.forEach((span, index) => {
      totalWidth += span.offsetWidth;

      if (index < spans.length - 1) {
        totalWidth += this.kerning;
      }
    });

    const radius = this.curveToRadius(this.currentCurveAmount);
    const arcLength = totalWidth;
    const angle = arcLength / Math.abs(radius);

    const startAngle = -angle / 2;

    let currentArcPosition = 0;

    spans.forEach((span, index) => {
      const charWidth = span.offsetWidth;
      const charCenter = currentArcPosition + charWidth / 2;

      const charAngle = startAngle + charCenter / Math.abs(radius);

      const x = Math.sin(charAngle) * Math.abs(radius);
      const y = (Math.cos(charAngle) - 1) * Math.abs(radius);

      const finalY = this.currentCurveAmount > 0 ? y : -y;

      const rotation =
        this.currentCurveAmount > 0 ? -(charAngle * 180) / Math.PI : (charAngle * 180) / Math.PI;

      span.style.transform = `translate(${x}px, ${finalY}px) rotate(${rotation}deg)`;
      span.style.transition = this.mouseCurve ? "transform 0.15s ease-out" : "none";

      currentArcPosition += charWidth + this.kerning;
    });

    const targetRadius = this.curveToRadius(this.targetCurveAmount);
    const maxHeight =
      Math.abs(targetRadius) -
      Math.abs(targetRadius) * Math.cos(arcLength / Math.abs(targetRadius) / 2);

    this.element.style.height = `${maxHeight + 50}px`;

    if (this.centered) {
      this.element.style.display = "flex";
      this.element.style.alignItems = "center";
      this.element.style.justifyContent = "center";

      const verticalOffset = this.currentCurveAmount > 0 ? maxHeight / 2 : -maxHeight / 2;
      spans.forEach((span) => {
        const currentTransform = span.style.transform;
        const match = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          const x = match[1];
          const y = parseFloat(match[2]);
          const rotation = currentTransform.match(/rotate\(([^)]+)\)/)[1];
          span.style.transform = `translate(${x}, ${y + verticalOffset}px) rotate(${rotation})`;
        }
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const curvedTexts = document.querySelectorAll(".text-curve");
  curvedTexts.forEach((element) => new TextCurve(element));
});

let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const curvedTexts = document.querySelectorAll(".text-curve");
    curvedTexts.forEach((element) => new TextCurve(element));
  }, 250);
});
