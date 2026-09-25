// Scribble Underline - applies class="scribble-underline" to any element
// (span, p, div, etc.) to drop a hand-drawn SVG squiggle beneath it. The
// default asset (set in mixins.scribble-underline) renders with CSS alone -
// this file only runs when an instance needs a different source.
//
// Config (data attribute, optional):
//   data-scribble-src="/static/img/custom-underline.svg"

document.querySelectorAll(".scribble-underline[data-scribble-src]").forEach(
  (el) => {
    el.style.setProperty(
      "--scribble-underline-src",
      `url("${el.dataset.scribbleSrc}")`,
    );
  },
);
