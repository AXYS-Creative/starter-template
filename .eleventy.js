const yaml = require("js-yaml");
const htmlmin = require("html-minifier");
const { DateTime } = require("luxon");
const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");

module.exports = async function (eleventyConfig) {
  eleventyConfig.setUseGitIgnore(false); // Disable automatic use of your .gitignore
  eleventyConfig.setDataDeepMerge(true); // Merge data instead of overriding

  eleventyConfig.addFilter("readableDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("dd LLL yyyy")
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
    collectionApi.getFilteredByGlob("./src/posts/**/*.md")
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

  // Token Replacement at build time vs client (prevent tokens from showing up briefly)
  eleventyConfig.addTransform("tokenReplace", function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      // Replace [%br%] and [%span%] tokens at build time
      return content
        .replace(/\[%br(\.[^\]]+)?%\]/g, (match, className) => {
          // Handle [%br%] or [%br.class-name%] tokens
          if (className) {
            const cleanClass = className.substring(1); // Remove the leading '.'
            return `<br class="${cleanClass}" aria-hidden="true">`;
          }
          return `<br aria-hidden="true">`;
        })
        .replace(
          /\[%span(\.[^\]]+)?%\](.*?)\[%span%\]/g,
          (match, className, innerContent) => {
            // Handle [%span%] or [%span.class-name%] tokens
            if (className) {
              const cleanClass = className.substring(1); // Remove the leading '.'
              return `<span class="${cleanClass}">${innerContent}</span>`;
            }
            return `<span>${innerContent}</span>`;
          }
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
