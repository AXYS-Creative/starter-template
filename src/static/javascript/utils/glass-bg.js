// Liquid Glass BG - applies class="glass-bg" or [data-glass-background] on
// any element. Two tiers:
//
//   1. CSS fallback (mixins.glass-bg in _mixins.scss) - a plain
//      backdrop-filter: blur()/saturate() tint. Renders everywhere.
//   2. The real effect, set here: a per-element SVG filter (a gradient
//      displacement map + three chromatic-offset feDisplacementMap passes)
//      applied via backdrop-filter: url(...), which refracts/bends whatever
//      is behind the element at its edges instead of just blurring it. Only
//      Chromium (Chrome/Edge/etc.) renders SVG filters through
//      backdrop-filter correctly today - Safari and Firefox silently keep
//      tier 1, which is why it's a real CSS backdrop-filter and not a
//      div-behind-a-div hack. Technique/markup reverse-engineered from
//      https://www.noovolife.com/noovo-lite/ (nav pills) and this CodePen:
//      https://codepen.io/Sis-the-builder/pen/GgjppJe
//
// Config (data attributes, all optional):
//   data-glass-blur="12"    fallback blur radius in px (tier 1 only)
//   data-glass-saturate="140"  fallback saturation, in % (tier 1 only)
//   data-glass-scale="40"   displacement strength in px (tier 2 only)
//   data-glass-background="dark"  darker tint, for use over light content

import { isSafari } from "../util.js";

const glassElements = document.querySelectorAll(
  ".glass-bg, [data-glass-background]",
);

glassElements.forEach((el) => {
  if (el.dataset.glassBlur) {
    el.style.setProperty("--glass-blur", `${el.dataset.glassBlur}px`);
  }
  if (el.dataset.glassSaturate) {
    el.style.setProperty("--glass-saturate", `${el.dataset.glassSaturate}%`);
  }
});

// SVG filters referenced through backdrop-filter only render in Chromium
// right now - Safari drops/ignores them and Firefox doesn't support
// backdrop-filter: url() at all. Leave those browsers on the CSS blur
// fallback rather than forcing a filter that won't paint
const isFirefox = /firefox/i.test(navigator.userAgent);
const supportsGlassDisplacement = glassElements.length && !isSafari() && !isFirefox;

if (supportsGlassDisplacement) {
  // The displacement map: a neutral gray (#808080 = no displacement) field
  // with a blurred, inset, rounded rect of the same neutral gray cut into
  // it. What's left exposed around that inset rect is the X/Y gradient
  // (screen-blended red/green channels), so only the *edge* of the element
  // refracts - the flat center passes SourceGraphic through untouched
  function buildDisplacementMap(width, height, radius) {
    const edgeInset = Math.max(4, Math.min(width, height) * 0.12);
    const edgeBlur = Math.max(3, Math.min(width, height) * 0.08);
    const innerWidth = Math.max(0, width - edgeInset * 2);
    const innerHeight = Math.max(0, height - edgeInset * 2);

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <style>.mix { mix-blend-mode: screen; }</style>
        <defs>
          <linearGradient id="Y" x1="0" x2="0" y1="8%" y2="92%">
            <stop offset="0%" stop-color="#0F0" />
            <stop offset="100%" stop-color="#000" />
          </linearGradient>
          <linearGradient id="X" x1="3%" x2="97%" y1="0" y2="0">
            <stop offset="0%" stop-color="#F00" />
            <stop offset="100%" stop-color="#000" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="#808080" />
        <g filter="blur(2px)">
          <rect width="${width}" height="${height}" fill="#000080" />
          <rect width="${width}" height="${height}" fill="url(#Y)" class="mix" />
          <rect width="${width}" height="${height}" fill="url(#X)" class="mix" />
          <rect
            x="${edgeInset}"
            y="${edgeInset}"
            width="${innerWidth}"
            height="${innerHeight}"
            rx="${radius}"
            ry="${radius}"
            fill="#808080"
            filter="blur(${edgeBlur}px)"
          />
        </g>
      </svg>
    `.trim();
  }

  // Three displacement passes at slightly different scales, isolated to one
  // color channel each and re-combined with feBlend - this is what gives
  // the edge a subtle chromatic fringe (like real glass/lens dispersion)
  // instead of a flat, uniform warp
  function buildFilterValue(width, height, radius, scale) {
    const map = buildDisplacementMap(width, height, radius);
    const mapUri = `data:image/svg+xml,${encodeURIComponent(map)}`;

    const filter = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <defs>
          <filter id="glass-bg-displace" color-interpolation-filters="sRGB">
            <feImage x="0" y="0" width="${width}" height="${height}" href="${mapUri}" result="displacementMap" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${scale}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedR" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${scale - 1}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedG" />
            <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${scale - 2}" xChannelSelector="R" yChannelSelector="G" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="displacedB" />
            <feBlend in="displacedR" in2="displacedG" mode="screen" />
            <feBlend in2="displacedB" mode="screen" />
          </filter>
        </defs>
      </svg>
    `.trim();

    const filterUri = `data:image/svg+xml,${encodeURIComponent(filter)}#glass-bg-displace`;
    return `blur(0.5px) url("${filterUri}")`;
  }

  function clampedRadius(el, width, height) {
    const raw = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return Math.min(raw, width / 2, height / 2);
  }

  function applyGlassFilter(el) {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const radius = Math.round(clampedRadius(el, width, height));
    const scale = parseFloat(el.dataset.glassScale) || 40;

    el.style.setProperty(
      "backdrop-filter",
      buildFilterValue(width, height, radius, scale),
    );
  }

  glassElements.forEach((el) => {
    applyGlassFilter(el);

    let resizeTimeout;
    new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => applyGlassFilter(el), 150);
    }).observe(el);
  });
}
