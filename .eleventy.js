const yaml = require("js-yaml");
const htmlmin = require("html-minifier");
const { DateTime } = require("luxon");
const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");

module.exports = async function (eleventyConfig) {
  eleventyConfig.setUseGitIgnore(false); // Disable automatic use of your .gitignore
  eleventyConfig.setDataDeepMerge(true); // Merge data instead of overriding

  eleventyConfig.addFilter("readableDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("dd LLL yyyy"),
  );

  // CMS-friendly, build-optimized image transform. Is the cached images folder needed still?
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "jpeg"],
    widths: [320, 768, 1280, 1920],
    htmlOptions: {
      imgAttributes: {
        loading: "lazy",
        decoding: "async",
        sizes:
          "(max-width: 600px) 320px, (max-width: 1200px) 768px, (max-width: 1800px) 1280px, 1920px",
      },
      pictureAttributes: {},
    },
  });

  // Generate xml sitemap // CHANGE ME URL
  eleventyConfig.addCollection("sitemap", function (collectionApi) {
    return collectionApi.getAll().filter((item) => {
      const url = item.url || "";
      const inputPath = item.inputPath || "";

      const isAdmin =
        url.startsWith("/admin/") || inputPath.includes("/admin/");
      const isEmails =
        url.startsWith("/emails/") || inputPath.includes("/emails/");
      const is404 = url.includes("404");
      const isFormSubmit = url.includes("form-submit");
      const isStyleGuide = url.includes("style-guide");

      return !isAdmin && !isEmails && !is404 && !isFormSubmit && !isStyleGuide;
    });
  });

  // To support .yaml extension in _data. You may remove this if using JSON
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  // Copy Static Files over to _site directory
  eleventyConfig.addPassthroughCopy({
    "./src/admin/config.yml": "./admin/config.yml",
    "./node_modules/alpinejs/dist/cdn.min.js": "./static/js/alpine.js",
  });
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/static");

  //
  // Custom Functions
  //

  // Fetch data from collection for .md files (blog, podcasts, etc.)
  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByGlob("./src/posts/**/*.md"),
  );

  // Minify HTML
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    // Eleventy 1.0+: use this.inputPath and this.outputPath instead
    if (outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }

    return content;
  });

  // Custom function to remove tokens from content (aria-labels, etc.) // Example: aria-label="{{ page_home.heading | removeTokens }}"
  eleventyConfig.addFilter("removeTokens", function (value) {
    if (typeof value !== "string") return value;
    return value.replace(/\[%.*?%\]/g, "");
  });

  // Slugfiy paths (see app.njk <main> tag — useful for nested pathnames: '/library/advanced' becomes '.main-library-advanced')
  eleventyConfig.addFilter("slugifyPath", function (path) {
    if (typeof path !== "string") return "";
    return path.replace(/\//g, "-");
  });

  // Real vector length — used by card-gnomon.njk to round/clamp corners on
  // edges that aren't axis-aligned (e.g. a tilted cutout's diagonal edges),
  // where a simple axis-projected distance is wrong.
  eleventyConfig.addFilter("sqrt", (value) => Math.sqrt(value));

  // Looks up one cutout by its `from` slot (e.g. 'top-right') out of
  // card-gnomon.njk's `cutouts` array — Nunjucks has no selectattr/find of
  // its own, and building an equivalent lookup object inside the template
  // would need object-mutation Nunjucks doesn't support either.
  eleventyConfig.addFilter(
    "findCutout",
    (cutouts, from) =>
      (cutouts || []).find((cutout) => cutout && cutout.from === from) || null,
  );

  // Generic "global defaults with override" merge (see CLAUDE.md) — takes
  // the shared defaults object and one instance that optionally carries
  // `override_defaults: true` + a `custom` object of the same shape, and
  // merges per-field so an instance can override just one value without
  // repeating every other one. Not card-gnomon-specific: reusable anywhere
  // this repo's defaults-with-override pattern applies.
  eleventyConfig.addFilter("mergeOverrides", (defaults, instance) => {
    const merged = { ...(defaults || {}) };
    if (instance && instance.override_defaults && instance.custom) {
      for (const key of Object.keys(merged)) {
        const value = instance.custom[key];
        if (value !== undefined && value !== null) merged[key] = value;
      }
    }
    return merged;
  });

  // Rounded-corner annular-sector ("donut slice") path generator for
  // circle-highlight.njk — same idea as card-gnomon's own gnomon_path macro
  // (build the geometry once, keep the njk declarative), but two of a
  // slice's four edges are circular arcs, and rounding those needs real
  // trig Nunjucks has no filters for, so the whole thing lives here instead
  // of in-template. Slices are always equal-angle, sweeping clockwise as
  // `index` increases — see circle-highlight.js for how scroll position
  // maps to the active index. `orientation` ('default' or 'tilted', see
  // circle_orientation in circle-highlight.njk) decides where 12 o'clock
  // falls relative to slice 0: 'tilted' seams slice 0's edge exactly there
  // (so its bulk favors one side), 'default' centers slice 0 there instead
  // by rotating everything back half a slice-width first.
  eleventyConfig.addFilter(
    "donutSlicePath",
    (index, count, holeSize, cornerRadius, gap, orientation) => {
      const cx = 50,
        cy = 50,
        rOuter = 50;
      const n = Math.max(1, count || 1);
      const rInner = (rOuter * Math.min(Math.max(holeSize || 0, 0), 99)) / 100;
      const hasHole = rInner > 1;
      const step = 360 / n;
      const orientationOffset = orientation === "tilted" ? 0 : -step / 2;
      const angleStart = index * step + orientationOffset;
      const angleEnd = angleStart + step;
      const angleMid = angleStart + step / 2; // unaffected by gap — captions stay centered on the slice's original sweep

      const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
      const pt = (deg, radius) => ({
        x: cx + radius * Math.cos(toRad(deg)),
        y: cy + radius * Math.sin(toRad(deg)),
      });
      const fmt = (p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;

      // `gap` needs each slice edge to end up parallel to (flush with) its
      // own untouched boundary angle, just shifted sideways by half the
      // requested linear spacing — not pivoted around the center, which is
      // what trimming by a single shared angle (or one derived from equal
      // arc length) both actually do, and the pivot tilts harder the more
      // the two radii it's shared across differ. A sideways shift of a
      // fixed linear distance `halfGap` crosses a circle of radius R at
      // exactly `asin(halfGap / R)` from the untouched boundary angle —
      // the boundary line still passes within `halfGap` of the center at
      // its closest approach, so R, halfGap, and that angle form a right
      // triangle (this is exact, not the small-angle `halfGap / R`
      // shortcut, which is close but leaves a residual tilt). Because R
      // differs between the inner arc, the outer arc, and each one's
      // corner-rounding rail (below), every point that needs a gap angle
      // asks for it at its own exact radius, so every point ends up on the
      // same straight offset line as its sibling slice's matching point.
      const halfGap = Math.max(gap || 0, 0) / 2;
      const gapAngleAt = (radius) =>
        halfGap > 0 && radius > 0
          ? Math.min(
              Math.asin(Math.min(halfGap / radius, 0.999)) * (180 / Math.PI),
              step / 2 - 0.01,
            )
          : 0;

      const gapOuterDeg = gapAngleAt(rOuter);
      const gapInnerDeg = hasHole ? gapAngleAt(rInner) : 0;

      const outerStart = angleStart + gapOuterDeg;
      const outerEnd = angleEnd - gapOuterDeg;
      const innerStart = angleStart + gapInnerDeg;
      const innerEnd = angleEnd - gapInnerDeg;
      const outerStep = outerEnd - outerStart;
      const innerStep = hasHole ? innerEnd - innerStart : 0;

      // Clamp the requested corner radius the same way card-gnomon clamps
      // its own `radius` prop — never let it eat past the ring's thickness
      // or past half of either arc edge this slice actually has, now that
      // the gap has already shrunk that available sweep.
      const sliceRad =
        (Math.min(outerStep, hasHole ? innerStep : outerStep) * Math.PI) / 180;
      const maxR =
        Math.min(
          (rOuter - rInner) / 2,
          (rOuter * sliceRad) / 2,
          hasHole ? (rInner * sliceRad) / 2 : Infinity,
        ) * 0.98;
      const r = Math.min(Math.max(cornerRadius || 0, 0), Math.max(maxR, 0));

      // The straight edge's rail points sit at rOuter - r / rInner + r,
      // not at rOuter / rInner exactly, so they need the gap angle worked
      // out at that inset radius too — reusing gapOuterDeg/gapInnerDeg
      // (worked out at the un-inset arc radius) here would put the rail
      // point a hair off the same flush line the arc's own trim points
      // sit on, kinking the edge right where it meets the rounded corner.
      const gapOuterRailDeg = gapAngleAt(rOuter - r);
      const gapInnerRailDeg = hasHole ? gapAngleAt(rInner + r) : 0;

      // Trimming an arc edge by `r` is an exact angular move (arc length
      // s = R*theta), not an approximation the way card-gnomon's
      // straight-edge trim would be here. `minTrim` only ever kicks in at
      // count === 1 (step === 360) with no gap — a real 360° sweep is
      // degenerate in SVG (start/end coincide, so nothing draws), so a
      // single "slice" always gets a hairline seam even at cornerRadius 0.
      // A gap already splits that seam on its own, so the hack backs off.
      const capped = (theta, avail) => Math.min(theta, avail / 2 - 0.01);
      const minTrim = step >= 359.9 && halfGap === 0 ? 0.01 : 0;
      const dtOuter = Math.max(
        r > 0 ? capped((r / rOuter) * (180 / Math.PI), outerStep) : 0,
        minTrim,
      );
      const dtInner = Math.max(
        hasHole && r > 0
          ? capped((r / rInner) * (180 / Math.PI), innerStep)
          : 0,
        minTrim,
      );

      const outerSweep = outerStep - 2 * dtOuter;
      const largeOuter = outerSweep > 180 ? 1 : 0;
      const outerSharpStart = pt(outerStart, rOuter);
      const outerSharpEnd = pt(outerEnd, rOuter);
      const outerTrimStart = pt(outerStart + dtOuter, rOuter);
      const outerTrimEnd = pt(outerEnd - dtOuter, rOuter);

      let d;

      if (!hasHole) {
        // Pie slice — the center apex stays sharp (rounding every slice's
        // tip at the exact same shared center point would just pile the
        // fillets on top of each other), only the two outer corners round.
        const railStart = pt(angleStart + gapOuterRailDeg, rOuter - r);
        const railEnd = pt(angleEnd - gapOuterRailDeg, rOuter - r);

        d = [
          `M ${cx},${cy}`,
          `L ${fmt(railStart)}`,
          r > 0 ? `Q ${fmt(outerSharpStart)} ${fmt(outerTrimStart)}` : "",
          `A ${rOuter} ${rOuter} 0 ${largeOuter} 1 ${fmt(outerTrimEnd)}`,
          r > 0 ? `Q ${fmt(outerSharpEnd)} ${fmt(railEnd)}` : "",
          `L ${cx},${cy}`,
          "Z",
        ]
          .filter(Boolean)
          .join(" ");
      } else {
        const innerSweep = innerStep - 2 * dtInner;
        const largeInner = innerSweep > 180 ? 1 : 0;
        const innerSharpStart = pt(innerStart, rInner);
        const innerSharpEnd = pt(innerEnd, rInner);
        const innerTrimStart = pt(innerStart + dtInner, rInner);
        const innerTrimEnd = pt(innerEnd - dtInner, rInner);
        const railInnerStart = pt(angleStart + gapInnerRailDeg, rInner + r);
        const railOuterStart = pt(angleStart + gapOuterRailDeg, rOuter - r);
        const railOuterEnd = pt(angleEnd - gapOuterRailDeg, rOuter - r);
        const railInnerEnd = pt(angleEnd - gapInnerRailDeg, rInner + r);

        d = [
          `M ${fmt(innerTrimStart)}`,
          r > 0 ? `Q ${fmt(innerSharpStart)} ${fmt(railInnerStart)}` : "",
          `L ${fmt(railOuterStart)}`,
          r > 0 ? `Q ${fmt(outerSharpStart)} ${fmt(outerTrimStart)}` : "",
          `A ${rOuter} ${rOuter} 0 ${largeOuter} 1 ${fmt(outerTrimEnd)}`,
          r > 0 ? `Q ${fmt(outerSharpEnd)} ${fmt(railOuterEnd)}` : "",
          `L ${fmt(railInnerEnd)}`,
          r > 0 ? `Q ${fmt(innerSharpEnd)} ${fmt(innerTrimEnd)}` : "",
          `A ${rInner} ${rInner} 0 ${largeInner} 0 ${fmt(innerTrimStart)}`,
          "Z",
        ]
          .filter(Boolean)
          .join(" ");
      }

      return { d, angle_mid: angleMid };
    },
  );

  // Token Replacement at build time vs client (prevent tokens from showing up briefly)
  eleventyConfig.addTransform("tokenReplace", function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      return (
        content
          // Handle paired tokens like [%span.class%]content[%/span%]
          .replace(
            /\[\%(?!\/)(\w+)(?:\.([\w\- ]+))?\%\](.*?)\[\%\1\%\]/gs,
            (match, tag, className, innerContent) => {
              const classAttr = className ? ` class="${className}"` : "";
              return `<${tag}${classAttr}>${innerContent}</${tag}>`;
            },
          )
          // Handle self-closing tokens like [%br.class%]
          .replace(
            /\[\%(\/?)(\w+)(?:\.([\w\- ]+))?\%\]/g,
            (match, slash, tag, className) => {
              if (slash) {
                return `</${tag}>`;
              }

              const classAttr = className ? ` class="${className}"` : "";
              const ariaHidden = tag === "br" ? ` aria-hidden="true"` : "";
              return `<${tag}${classAttr}${ariaHidden}>`;
            },
          )
      );
    }
    return content;
  });

  return {
    dir: {
      input: "src",
    },
    htmlTemplateEngine: "njk",
  };
};
