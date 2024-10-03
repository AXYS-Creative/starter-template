const yaml = require("js-yaml");
const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const htmlmin = require("html-minifier");

module.exports = function (eleventyConfig) {
  // Disable automatic use of your .gitignore
  eleventyConfig.setUseGitIgnore(false);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // human readable date
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(
      "dd LLL yyyy"
    );
  });

  // Syntax Highlighting for Code blocks
  eleventyConfig.addPlugin(syntaxHighlight);

  // To Support .yaml Extension in _data
  // You may remove this if you can use JSON
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  // Copy Static Files over to _site directory
  eleventyConfig.addPassthroughCopy({
    "./src/admin/config.yml": "./admin/config.yml",
    "./node_modules/alpinejs/dist/cdn.min.js": "./static/js/alpine.js",
  });
  eleventyConfig.addPassthroughCopy("./src/static/styles");
  eleventyConfig.addPassthroughCopy("./src/static/fonts");
  eleventyConfig.addPassthroughCopy("./src/static/img");
  eleventyConfig.addPassthroughCopy("./src/static/javascript");
  eleventyConfig.addPassthroughCopy("./src/robots.txt");

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

  // Let Eleventy transform HTML files as nunjucks
  // So that we can use .html instead of .njk
  return {
    dir: {
      input: "src",
    },
    htmlTemplateEngine: "njk",
  };
};
