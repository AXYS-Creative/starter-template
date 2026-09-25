# Starter Template — CMS & Scaffolding Patterns

This is a copy-once component/section library (see README.md for the cleanup
checklist). The notes below are lessons learned building out sites from this
template (first applied on the `grovewood` project) — apply them on any
project that starts from this repo, not just re-derive them from scratch.

## Decap CMS `editor: preview` pattern

Preview components for the visual editor pane live in `src/admin/index.njk`,
one inline `<script>` block, no JSX/build step:

```js
const { h, createClass } = window;

let SomePreview = createClass({
  render() {
    const data = this.props.entry.getIn(["data"]).toJS();
    return h("section", { className: "..." }, /* mirror the real partial's markup */);
  },
});

CMS.registerPreviewTemplate("<name>", SomePreview);
```

- `<name>` must match the `files:` entry's `name:` in `src/admin/config.yml`,
  and that entry needs `editor: { preview: true }`.
- Build the `h(...)` tree to mirror the actual `_includes` partial's markup
  and class names — `CMS.registerPreviewStyle("/static/styles/styles.css")`
  is what makes the preview look right, and it only works if class names
  match the real component/section.
- `config.yml` `fields:` for an entry must match the shape of the
  corresponding `src/_data/**/*.yaml` file — that yaml is the source of
  truth, not the other way around.
- **Gotchas that will bite on every new preview:**
  - Boolean fields read back as `undefined` in the preview until an editor
    touches them — default them explicitly in the component
    (`data.some_flag ?? true`), don't just truthy-check.
  - Any class that JS/GSAP adds at runtime (stagger-in animations, counter
    digits, etc.) needs to be hardcoded onto the element in the preview,
    since the preview never runs the site's real JS. Otherwise the preview
    renders content invisible/opacity-0/unstyled.
  - Any build-time token-replace transform (e.g. a `[%br%]`-style shortcode
    handled in `.eleventy.js`) needs an equivalent JS helper in the preview
    (e.g. a small `withBreaks()` string-split-and-`<br/>` function) or the
    raw token shows up literally in the preview text.
  - If two data files share one njk partial (e.g. a "plain" and a
    "with-CTA" variant of the same section), register the *same* preview
    component under both names in `config.yml`/`index.njk` rather than
    duplicating it — read any modifier class off a hidden `class` field in
    the data instead of hardcoding it in the component, so the one preview
    correctly reflects each variant's real page class.
- Build previews incrementally, one section/component at a time (footer or
  header first is a reasonable place to start — smallest surface area to
  get the pattern right before repeating it).

## Global-defaults-with-override pattern

When a section type gets reused across many pages with the *same* behavior
config repeated in every page's data yaml (pagination, autoplay timing, drag
threshold, etc.), that config drifts — pages silently diverge because
someone forgot to copy a field, or a value gets hand-edited on one page only.

Instead:

- Move the shared behavior fields into one `src/_data/global/<name>.yaml`
  file, exposed in Decap admin as a "Global Defaults" entry, read in
  templates as `global.<name>.<field>`.
- Define the admin schema for those fields **once** as a YAML anchor in
  `config.yml`'s top-level `partials:` block (e.g. `&some_settings_fields`),
  and reuse that anchor both for the new global `files:` entry and for each
  page's per-instance override object.
- Each page's instance of the section keeps only `override_defaults`
  (boolean, default `false`) + `custom` (object, same anchor fields) in its
  own data yaml — content-specific fields (slides, copy, images) stay
  per-page as normal.
- The njk partial merges per-field: `custom.<field> if override_defaults and
  defined, else global.<field>` — so a page can override just one field
  without repeating every other one.
- This is worth doing specifically because it lets legitimate one-off
  exceptions exist (a single page needing a different drag threshold)
  without reopening the door to accidental full-config duplication
  everywhere else.
- The per-field merge itself (`custom.<field> if override_defaults and
  defined, else default.<field>`) doesn't have to be page-level/global —
  the same shape works for one repeating component inside a single section
  (e.g. `gallery-horizontal.njk` giving every `card-gnomon.njk` instance one
  shared `card_gnomon_defaults` object, with per-image `override_defaults` +
  `custom` for the rare card that needs to differ). A generic
  `mergeOverrides(defaults, instance)` Nunjucks filter implementing this
  merge already exists in `.eleventy.js` — reuse it instead of writing
  per-field ternaries again.

## Data-driven visibility, not a redundant flag

Don't gate whether an element renders behind a separate boolean flag
(`extra_content: true/false`) when the data needed to render it already
carries that information (`extra_hero_img.src` being set or empty). Two
sources of truth for the same condition will eventually disagree — derive
visibility directly from the data field being truthy/present. When
scaffolding a new page and the asset doesn't exist yet, just leave the
`src:` field commented out rather than adding a flag to suppress it.

## Vendor CSS scope

If a partial/section can be reused on more than one page, don't load its
vendor stylesheet (e.g. a CDN carousel library's CSS) behind a
page-path-specific `{% if %}` in the base layout — that works until the
component gets reused elsewhere and silently renders broken (unstyled
flex/grid, layout jumps) with no obvious error. Load vendor CSS site-wide
if the component itself might end up site-wide, even if it's only used on
one page today.

## Page-scaffolding script pattern (not yet built here)

grovewood added `scripts/scaffold-section-page.js` (`npm run scaffold-page
-- <slug> <section1,section2,...>`) once it needed a *third* section-stack
page, to stop hand-copying an existing page's njk/data/admin-config/preview
wiring. It:

1. Clones a reference page's per-section field schema out of
   `admin/config.yml` (picks one existing page that already has every
   section kind wired up).
2. Renames that page's slug tokens throughout the cloned schema.
3. Registers the new file names in `admin/index.njk`, reusing existing
   preview components — no new preview code needed unless a genuinely new
   section *kind* is introduced.
4. Generates `src/<slug>.njk` with `{% set %}` + `{% include %}` pairs in
   the order given.

It deliberately does **not** touch content — data yaml files are still
written by hand per page, following an existing page's yaml as the
structural reference.

This template's current section set (Carousel Hero, Hero Simple, Price
Cards, Scroll Horizontal, Scroll Stack) differs from grovewood's, so the
script itself wasn't ported — but if/when a project built from this
template needs 3+ near-identical section-stack pages, build a script
following this shape rather than continuing to hand-copy pages one at a
time.
