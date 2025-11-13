class TextCurve {
  constructor(element) {
    this.element = element;
    this.text = element.textContent;
    this.radius = parseFloat(element.dataset.curveRadius) || 500;
    this.kerning = parseFloat(element.dataset.curveKerning) || 0;
    this.centered = element.hasAttribute("data-curve-centered");
    this.init();
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

  positionCharacters(spans) {
    const charCount = spans.length;

    let totalWidth = 0;
    spans.forEach((span, index) => {
      totalWidth += span.offsetWidth;

      if (index < spans.length - 1) {
        totalWidth += this.kerning;
      }
    });

    const arcLength = totalWidth;
    const angle = arcLength / Math.abs(this.radius);

    const startAngle = -angle / 2;

    let currentArcPosition = 0;

    spans.forEach((span, index) => {
      const charWidth = span.offsetWidth;
      const charCenter = currentArcPosition + charWidth / 2;

      const charAngle = startAngle + charCenter / Math.abs(this.radius);

      const x = Math.sin(charAngle) * Math.abs(this.radius);
      const y = (Math.cos(charAngle) - 1) * Math.abs(this.radius);

      const finalY = this.radius > 0 ? y : -y;

      const rotation = this.radius > 0 ? -(charAngle * 180) / Math.PI : (charAngle * 180) / Math.PI;

      span.style.transform = `translate(${x}px, ${finalY}px) rotate(${rotation}deg)`;

      currentArcPosition += charWidth + this.kerning;
    });

    const maxHeight = Math.abs(this.radius) - Math.abs(this.radius) * Math.cos(angle / 2);

    this.element.style.height = `${maxHeight + 50}px`;

    if (this.centered) {
      this.element.style.display = "flex";
      this.element.style.alignItems = "center";
      this.element.style.justifyContent = "center";

      const verticalOffset = this.radius > 0 ? maxHeight / 2 : -maxHeight / 2;
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
