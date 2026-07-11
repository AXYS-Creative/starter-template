// ─────────────────────────────────────────────────────────────────────────
// WebGL background — deep navy field, drifting light lobes, diagonal crease,
// vignette, film grain. Lobes drift and gently form/dissolve at randomized,
// independent rates. Grain and crease remain static. No mouse interaction.
// ─────────────────────────────────────────────────────────────────────────

(function () {
  const canvas = document.querySelector(".dust-bg");
  if (!canvas) return;

  // Small helper to accept hex or rgba() strings and pre-parse to [r,g,b] floats
  function css(input) {
    if (input.startsWith("#")) {
      let hex = input.slice(1);
      if (hex.length === 3)
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      const int = parseInt(hex, 16);
      return [
        ((int >> 16) & 255) / 255,
        ((int >> 8) & 255) / 255,
        (int & 255) / 255,
      ];
    }
    const m = input.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    }
    return [0, 0, 0];
  }

  const MAX_LOBES = 4;

  // ── Tunables ────────────────────────────────────────────────────────────
  const CFG = {
    // Color palettes — "dark" is the current/default look. "light" is a
    // starting placeholder; tune it to match your site's actual light theme.
    colors: {
      dark: {
        baseColor: css("#040d1f"),
        highlightColor: css("#3d5f8a"),
      },
      light: {
        baseColor: css("#f8fbfc"), // sampled from the light-theme reference (edges/corners)
        highlightColor: css("#39a2d7"), // sampled from the reference (center glow)
      },
    },

    // Theme reactivity — opt-in only. If the canvas has this attribute,
    // the background watches document.documentElement's data-theme
    // (set by theme-toggle.js) and swaps colors.dark/colors.light to match.
    // If the attribute is absent, this is skipped entirely — no observer,
    // no reads, identical to current behavior.
    theme: {
      toggleAttribute: "data-theme-toggle",
      transitionSpeed: 0.04, // per-frame easing for the toggle-based crossfade (section-based tracks scroll directly, no lag)

      // Section-based scroll theming — opt-in via this attribute on the canvas.
      sectionAttribute: "data-section-theme",
      sectionThemeAttr: "data-canvas-theme", // e.g. data-canvas-theme="light" on a <section>
      sectionStartAttr: "data-canvas-start", // e.g. data-canvas-start="0.2-0.8" (defaults to "0-1")
    },

    // Lobe field — the soft moving glows
    lobes: {
      count: 3, // 1–4
      driftRadius: 0.46, // how far each lobe wanders from its base position
      radiusBase: 0.3, // average glow radius
      radiusVariance: 0.14, // +/- randomization per lobe
      formMin: 0.12, // lowest opacity a lobe dips to (0 = fully dissolves)
    },

    // Master motion speed — scales both drift and form/dissolve pulsing.
    // 0 = frozen (same as the static version), 1 = default pace.
    motionSpeed: 3.5,

    // Shimmer/cracks — a cellular (voronoi) seam pattern, warped so the
    // seams read as organic cracks rather than a hex grid, drifting across
    // the screen in one direction. Only visible where lobes already glow.
    shimmer: {
      angle: -20, // direction the crack pattern drifts, degrees
      driftSpeed: 0.012, // speed the pattern moves along `angle`
      cellScale: 225.0, // voronoi cell density (higher = smaller cracked cells)
      warpAmount: 1.5, // how much organic distortion bends the cells (higher = less hexagonal)
      warpScale: 1.6, // spatial frequency of the organic warp
      warpSpeed: 0.015, // how fast the warp itself slowly evolves
      crackWidth: 0.05, // thickness of the bright crack seams
      refractionStrength: 0.4, // how strongly light bends near a seam (0 = invisible, higher = more distortion). No color is added — this is a bend, not a highlight.
    },

    // Mouse interaction — lobes get pushed away from the cursor, and both
    // lobes and cracks get a local brightness/intensity boost near it.
    // Position and influence strength are both eased, never velocity-based.
    mouse: {
      radius: 0.35, // effective radius of cursor influence for push/crack proximity
      glowRadius: 0.5, // size of the light that tracks the cursor (independent of `radius`)
      pushStrength: 0.14, // how far lobes (and crack seams) get displaced away from the cursor
      glowBoost: 0.32, // extra brightness added directly under the cursor
      crackBoost: 0.6, // multiplier boost to how strongly cracks refract light near the cursor (proximity-based, stays while hovering still)
      positionSmoothing: 0.08, // per-frame easing toward the cursor's real position (lower = smoother/laggier)
      influenceSmoothing: 0.05, // per-frame easing for the effect fading in/out on enter/leave
      velocityReference: 1.2, // cursor speed (screen-units/sec) at which push reaches full strength
      velocitySmoothing: 0.15, // per-frame easing of the speed reading, to avoid jittery push
    },

    // Diagonal crease (the soft shadow band sweeping through the upper right)
    creaseAngle: -20, // degrees
    creaseOffset: 0.08,
    creaseWidth: 0.24,
    creaseStrength: 0.12,

    // Vignette
    vignetteStart: 0.15,
    vignetteEnd: 0.95,
    vignetteStrength: 0.55,

    // Film grain (static, per-pixel, not time-based)
    grainIntensity: 0.035,
  };

  // ── WebGL setup ─────────────────────────────────────────────────────────
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) throw new Error("WebGL not supported");

  const vertSrc = `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

  const fragSrc = `
  precision highp float;
  #define MAX_LOBES ${MAX_LOBES}

  uniform vec2 uResolution;
  uniform vec3 uBaseColor;
  uniform vec3 uHighlightColor;
  uniform float uTime;

  uniform vec2 uLobeBasePos[MAX_LOBES];
  uniform vec2 uLobeDriftFreq[MAX_LOBES];
  uniform vec2 uLobePhase[MAX_LOBES];
  uniform float uLobeDriftAmp[MAX_LOBES];
  uniform float uLobeRadius[MAX_LOBES];
  uniform float uLobeFormFreq[MAX_LOBES];
  uniform float uLobeFormPhase[MAX_LOBES];
  uniform float uLobeFormMin;
  uniform int uLobeCount;

  uniform float uShimmerAngle;
  uniform float uShimmerDriftSpeed;
  uniform float uShimmerCellScale;
  uniform float uShimmerWarpAmount;
  uniform float uShimmerWarpScale;
  uniform float uShimmerWarpSpeed;
  uniform float uShimmerCrackWidth;
  uniform float uShimmerRefractionStrength;

  uniform vec2 uMousePos;
  uniform float uMouseInfluence;
  uniform float uMouseRadius;
  uniform float uMouseGlowRadius;
  uniform float uMousePushStrength;
  uniform float uMouseGlowBoost;
  uniform float uMouseCrackBoost;
  uniform vec2 uMouseVelocityDir;
  uniform float uMouseVelocityFactor;

  uniform float uCreaseAngle;
  uniform float uCreaseOffset;
  uniform float uCreaseWidth;
  uniform float uCreaseStrength;
  uniform float uVignetteStart;
  uniform float uVignetteEnd;
  uniform float uVignetteStrength;
  uniform float uGrainIntensity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 hash22(vec2 p) {
    vec2 q = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(q) * 43758.5453);
  }

  // Returns (F1, F2) — distances to the nearest and second-nearest cell points
  vec2 voronoi(vec2 coord) {
    vec2 cellId = floor(coord);
    vec2 localPos = fract(coord);

    float f1 = 8.0;
    float f2 = 8.0;

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = hash22(cellId + neighbor);
        vec2 diff = neighbor + point - localPos;
        float dist = length(diff);

        if (dist < f1) {
          f2 = f1;
          f1 = dist;
        } else if (dist < f2) {
          f2 = dist;
        }
      }
    }

    return vec2(f1, f2);
  }

  void main() {
    // Centered, aspect-normalized coordinate space
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

    // Accumulate drifting, forming/dissolving lobes. Centers/radii/envelopes
    // are kept so the crack refraction pass below can resample this same
    // light field at a bent position, instead of adding a separate color.
    vec2 lobeCenters[MAX_LOBES];
    float lobeRadiiArr[MAX_LOBES];
    float lobeEnvelopes[MAX_LOBES];

    float totalLobe = 0.0;
    for (int i = 0; i < MAX_LOBES; i++) {
      if (i >= uLobeCount) break;

      vec2 pos = uLobeBasePos[i] + uLobeDriftAmp[i] * vec2(
        sin(uTime * uLobeDriftFreq[i].x + uLobePhase[i].x),
        cos(uTime * uLobeDriftFreq[i].y + uLobePhase[i].y)
      );

      // Push this lobe in the direction of cursor travel — only while moving
      float mDist = length(pos - uMousePos);
      float mProximity = smoothstep(uMouseRadius, 0.0, mDist) * uMouseInfluence;
      float mPush = mProximity * uMouseVelocityFactor;
      pos += uMouseVelocityDir * mPush * uMousePushStrength;

      float pulse = 0.5 + 0.5 * sin(uTime * uLobeFormFreq[i] + uLobeFormPhase[i]);
      float envelope = mix(uLobeFormMin, 1.0, pow(pulse, 1.5));

      lobeCenters[i] = pos;
      lobeRadiiArr[i] = uLobeRadius[i];
      lobeEnvelopes[i] = envelope;

      float d = length(p - pos);
      float g = exp(-(d * d) / (2.0 * uLobeRadius[i] * uLobeRadius[i]));

      totalLobe += g * envelope;
    }

    // Soft clamp so overlapping lobes don't blow out to flat white
    float glow = 1.0 - exp(-totalLobe);
    vec3 color = mix(uBaseColor, uHighlightColor, clamp(glow, 0.0, 1.0));

    // Direct brightness boost right under the cursor
    float mouseGlowDist = length(p - uMousePos);
    float mouseGlowFalloff = exp(-(mouseGlowDist * mouseGlowDist) / (2.0 * uMouseGlowRadius * uMouseGlowRadius)) * uMouseInfluence;
    color += uHighlightColor * uMouseGlowBoost * mouseGlowFalloff;

    // Shimmer/cracks — voronoi seam pattern, drifting along uShimmerAngle,
    // with the cell grid bent by a slow organic warp so seams read as
    // irregular cracks. Masked by glow so it only appears where lit.
    float shimRad = radians(uShimmerAngle);
    vec2 shimDir = vec2(cos(shimRad), sin(shimRad));
    vec2 driftedP = p - shimDir * uTime * uShimmerDriftSpeed;

    // Cap the warp amplitude relative to its frequency so the coordinate
    // mapping can never fold on itself — folding is what causes a moving
    // "seam"/tear line (cells collapse to zero width right where it folds).
    // 0.9 keeps a safety margin under the theoretical fold point of 1.0.
    float safeWarpAmount = min(uShimmerWarpAmount, 0.9 / max(uShimmerWarpScale, 0.001));

    // Push the crack seams in the direction of cursor travel — only while moving.
    // Brightness boost (crackProximity) stays proximity-based so hovering still
    // glows even at rest; only the geometric warp is velocity-gated.
    float crackProximity = smoothstep(uMouseRadius, 0.0, length(p - uMousePos)) * uMouseInfluence;
    float crackPushAmount = crackProximity * uMouseVelocityFactor;
    driftedP -= uMouseVelocityDir * crackPushAmount * uMousePushStrength;

    vec2 warp = vec2(
      sin(driftedP.y * uShimmerWarpScale + uTime * uShimmerWarpSpeed),
      sin(driftedP.x * uShimmerWarpScale - uTime * uShimmerWarpSpeed * 0.8)
    ) * safeWarpAmount;

    vec2 crackCoord = (driftedP + warp) * uShimmerCellScale;
    vec2 f = voronoi(crackCoord);
    float seam = 1.0 - smoothstep(0.0, uShimmerCrackWidth, f.y - f.x);

    // Bend the light near the seam instead of adding color to it — reuse
    // the warp field (already smooth and cheap) as the bend direction,
    // concentrated right at the seam via the seam mask.
    float refractAmount = (1.0 + uMouseCrackBoost * crackProximity) * uShimmerRefractionStrength;
    vec2 refractOffset = warp * refractAmount * seam;

    float totalLobeRefracted = 0.0;
    for (int i = 0; i < MAX_LOBES; i++) {
      if (i >= uLobeCount) break;
      float dr = length((p + refractOffset) - lobeCenters[i]);
      float gr = exp(-(dr * dr) / (2.0 * lobeRadiiArr[i] * lobeRadiiArr[i]));
      totalLobeRefracted += gr * lobeEnvelopes[i];
    }
    float glowRefracted = 1.0 - exp(-totalLobeRefracted);
    vec3 refractedColor = mix(uBaseColor, uHighlightColor, clamp(glowRefracted, 0.0, 1.0));

    color = mix(color, refractedColor, seam * glow);

    // Diagonal crease / shadow sweep (static)
    float rad = radians(uCreaseAngle);
    float ca = cos(rad);
    float sa = sin(rad);
    float along = p.x * ca - p.y * sa;
    float crease = smoothstep(uCreaseOffset, uCreaseOffset + uCreaseWidth, along)
                 * (1.0 - smoothstep(uCreaseOffset + uCreaseWidth, uCreaseOffset + uCreaseWidth * 2.2, along));
    color -= crease * uCreaseStrength;

    // Vignette
    float r = length(p);
    float vig = 1.0 - uVignetteStrength * smoothstep(uVignetteStart, uVignetteEnd, r);
    color *= vig;

    // Static film grain
    float n = hash(gl_FragCoord.xy);
    color += (n - 0.5) * uGrainIntensity;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

  function compileShader(type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("Shader compile error: " + info);
    }
    return shader;
  }

  const vertShader = compileShader(gl.VERTEX_SHADER, vertSrc);
  const fragShader = compileShader(gl.FRAGMENT_SHADER, fragSrc);

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("Program link error: " + gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  // Fullscreen triangle (covers viewport without a quad's extra vertices)
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const uniforms = {
    resolution: gl.getUniformLocation(program, "uResolution"),
    time: gl.getUniformLocation(program, "uTime"),
    baseColor: gl.getUniformLocation(program, "uBaseColor"),
    highlightColor: gl.getUniformLocation(program, "uHighlightColor"),

    lobeBasePos: gl.getUniformLocation(program, "uLobeBasePos[0]"),
    lobeDriftFreq: gl.getUniformLocation(program, "uLobeDriftFreq[0]"),
    lobePhase: gl.getUniformLocation(program, "uLobePhase[0]"),
    lobeDriftAmp: gl.getUniformLocation(program, "uLobeDriftAmp[0]"),
    lobeRadius: gl.getUniformLocation(program, "uLobeRadius[0]"),
    lobeFormFreq: gl.getUniformLocation(program, "uLobeFormFreq[0]"),
    lobeFormPhase: gl.getUniformLocation(program, "uLobeFormPhase[0]"),
    lobeFormMin: gl.getUniformLocation(program, "uLobeFormMin"),
    lobeCount: gl.getUniformLocation(program, "uLobeCount"),

    shimmerAngle: gl.getUniformLocation(program, "uShimmerAngle"),
    shimmerDriftSpeed: gl.getUniformLocation(program, "uShimmerDriftSpeed"),
    shimmerCellScale: gl.getUniformLocation(program, "uShimmerCellScale"),
    shimmerWarpAmount: gl.getUniformLocation(program, "uShimmerWarpAmount"),
    shimmerWarpScale: gl.getUniformLocation(program, "uShimmerWarpScale"),
    shimmerWarpSpeed: gl.getUniformLocation(program, "uShimmerWarpSpeed"),
    shimmerCrackWidth: gl.getUniformLocation(program, "uShimmerCrackWidth"),
    shimmerRefractionStrength: gl.getUniformLocation(
      program,
      "uShimmerRefractionStrength",
    ),

    mousePos: gl.getUniformLocation(program, "uMousePos"),
    mouseInfluence: gl.getUniformLocation(program, "uMouseInfluence"),
    mouseRadius: gl.getUniformLocation(program, "uMouseRadius"),
    mouseGlowRadius: gl.getUniformLocation(program, "uMouseGlowRadius"),
    mousePushStrength: gl.getUniformLocation(program, "uMousePushStrength"),
    mouseGlowBoost: gl.getUniformLocation(program, "uMouseGlowBoost"),
    mouseCrackBoost: gl.getUniformLocation(program, "uMouseCrackBoost"),
    mouseVelocityDir: gl.getUniformLocation(program, "uMouseVelocityDir"),
    mouseVelocityFactor: gl.getUniformLocation(program, "uMouseVelocityFactor"),

    creaseAngle: gl.getUniformLocation(program, "uCreaseAngle"),
    creaseOffset: gl.getUniformLocation(program, "uCreaseOffset"),
    creaseWidth: gl.getUniformLocation(program, "uCreaseWidth"),
    creaseStrength: gl.getUniformLocation(program, "uCreaseStrength"),
    vignetteStart: gl.getUniformLocation(program, "uVignetteStart"),
    vignetteEnd: gl.getUniformLocation(program, "uVignetteEnd"),
    vignetteStrength: gl.getUniformLocation(program, "uVignetteStrength"),
    grainIntensity: gl.getUniformLocation(program, "uGrainIntensity"),
  };

  // ── Randomized, per-lobe motion parameters (generated once at init) ──────
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function generateLobeParams() {
    const basePos = new Float32Array(MAX_LOBES * 2);
    const driftFreq = new Float32Array(MAX_LOBES * 2);
    const phase = new Float32Array(MAX_LOBES * 2);
    const driftAmp = new Float32Array(MAX_LOBES);
    const radius = new Float32Array(MAX_LOBES);
    const formFreq = new Float32Array(MAX_LOBES);
    const formPhase = new Float32Array(MAX_LOBES);

    for (let i = 0; i < MAX_LOBES; i++) {
      // Spread base positions loosely around center so they overlap and
      // hand off to one another as they pulse in/out.
      basePos[i * 2] = rand(-0.32, 0.32);
      basePos[i * 2 + 1] = rand(-0.28, 0.28);

      // Distinct, non-resonant drift frequencies per axis -> organic wander
      // instead of a repeating loop.
      driftFreq[i * 2] = rand(0.08, 0.22);
      driftFreq[i * 2 + 1] = rand(0.08, 0.22);

      phase[i * 2] = rand(0, Math.PI * 2);
      phase[i * 2 + 1] = rand(0, Math.PI * 2);

      driftAmp[i] = CFG.lobes.driftRadius * rand(0.7, 1.3);
      radius[i] = CFG.lobes.radiusBase + rand(-1, 1) * CFG.lobes.radiusVariance;

      // Slow, independent formation cycle per lobe so they don't pulse in sync
      formFreq[i] = rand(0.05, 0.14);
      formPhase[i] = rand(0, Math.PI * 2);
    }

    return { basePos, driftFreq, phase, driftAmp, radius, formFreq, formPhase };
  }

  const lobeParams = generateLobeParams();

  // ── Theme handling ──────────────────────────────────────────────────────
  const watchThemeToggle = canvas.hasAttribute(CFG.theme.toggleAttribute);
  const watchSectionTheme = canvas.hasAttribute(CFG.theme.sectionAttribute);

  function getActiveThemeName() {
    if (!watchThemeToggle) return "dark";
    const docTheme = document.documentElement.getAttribute("data-theme");
    return docTheme === "light" ? "light" : "dark";
  }

  // Crossfades smoothly between palettes instead of swapping instantly.
  // currentColor holds the live, eased values; targetThemeName is just a
  // cheap cached label updated by the observer (no per-frame DOM reads).
  let targetThemeName = getActiveThemeName();
  const initialPalette = CFG.colors[targetThemeName];
  const currentColor = {
    base: initialPalette.baseColor.slice(),
    highlight: initialPalette.highlightColor.slice(),
  };

  function updateThemeColors() {
    const target = CFG.colors[targetThemeName];
    for (let i = 0; i < 3; i++) {
      currentColor.base[i] +=
        (target.baseColor[i] - currentColor.base[i]) *
        CFG.theme.transitionSpeed;
      currentColor.highlight[i] +=
        (target.highlightColor[i] - currentColor.highlight[i]) *
        CFG.theme.transitionSpeed;
    }
    gl.uniform3fv(uniforms.baseColor, currentColor.base);
    gl.uniform3fv(uniforms.highlightColor, currentColor.highlight);
  }

  // ── Section-based scroll theming ────────────────────────────────────────
  // Reads every element with data-canvas-theme, in document order. Each
  // section's own progress runs 0 (its top is at the viewport's bottom) to
  // 1 (its top has reached the viewport's top), remapped through its
  // data-canvas-start range (default "0-1"). Sections are blended in order,
  // so later sections layer on top of earlier ones, and scrolling back up
  // reverses cleanly since this is recomputed fresh from live scroll
  // position every frame — nothing here depends on the previous frame.
  let themeSections = [];

  function parseStartRange(attrValue) {
    if (!attrValue) return { start: 0, end: 1 };
    const match = attrValue.match(/(-?[\d.]+)\s*-\s*(-?[\d.]+)/);
    if (!match) return { start: 0, end: 1 };
    return { start: parseFloat(match[1]), end: parseFloat(match[2]) };
  }

  function collectThemeSections() {
    const elements = document.querySelectorAll(
      `[${CFG.theme.sectionThemeAttr}]`,
    );
    themeSections = Array.from(elements).map((el) => {
      const themeName =
        el.getAttribute(CFG.theme.sectionThemeAttr) === "light"
          ? "light"
          : "dark";
      const { start, end } = parseStartRange(
        el.getAttribute(CFG.theme.sectionStartAttr),
      );
      return { el, themeName, start, end };
    });
  }

  if (watchSectionTheme) collectThemeSections();

  function computeSectionBlendedColor() {
    // Dark is the page's resting default before any section has triggered.
    const base = CFG.colors.dark.baseColor.slice();
    const highlight = CFG.colors.dark.highlightColor.slice();
    const viewportHeight = window.innerHeight;

    for (const section of themeSections) {
      const rect = section.el.getBoundingClientRect();
      const rawProgress = Math.min(
        Math.max((viewportHeight - rect.top) / viewportHeight, 0),
        1,
      );
      const range = section.end - section.start;
      const mapped =
        range !== 0
          ? Math.min(Math.max((rawProgress - section.start) / range, 0), 1)
          : rawProgress >= section.start
            ? 1
            : 0;

      const target = CFG.colors[section.themeName];
      for (let i = 0; i < 3; i++) {
        base[i] += (target.baseColor[i] - base[i]) * mapped;
        highlight[i] += (target.highlightColor[i] - highlight[i]) * mapped;
      }
    }

    return { base, highlight };
  }

  function setStaticUniforms() {
    gl.uniform3fv(uniforms.baseColor, currentColor.base);
    gl.uniform3fv(uniforms.highlightColor, currentColor.highlight);

    gl.uniform2fv(uniforms.lobeBasePos, lobeParams.basePos);
    gl.uniform2fv(uniforms.lobeDriftFreq, lobeParams.driftFreq);
    gl.uniform2fv(uniforms.lobePhase, lobeParams.phase);
    gl.uniform1fv(uniforms.lobeDriftAmp, lobeParams.driftAmp);
    gl.uniform1fv(uniforms.lobeRadius, lobeParams.radius);
    gl.uniform1fv(uniforms.lobeFormFreq, lobeParams.formFreq);
    gl.uniform1fv(uniforms.lobeFormPhase, lobeParams.formPhase);
    gl.uniform1f(uniforms.lobeFormMin, CFG.lobes.formMin);
    gl.uniform1i(uniforms.lobeCount, Math.min(CFG.lobes.count, MAX_LOBES));

    gl.uniform1f(uniforms.shimmerAngle, CFG.shimmer.angle);
    gl.uniform1f(uniforms.shimmerDriftSpeed, CFG.shimmer.driftSpeed);
    gl.uniform1f(uniforms.shimmerCellScale, CFG.shimmer.cellScale);
    gl.uniform1f(uniforms.shimmerWarpAmount, CFG.shimmer.warpAmount);
    gl.uniform1f(uniforms.shimmerWarpScale, CFG.shimmer.warpScale);
    gl.uniform1f(uniforms.shimmerWarpSpeed, CFG.shimmer.warpSpeed);
    gl.uniform1f(uniforms.shimmerCrackWidth, CFG.shimmer.crackWidth);
    gl.uniform1f(
      uniforms.shimmerRefractionStrength,
      CFG.shimmer.refractionStrength,
    );

    gl.uniform1f(uniforms.mouseRadius, CFG.mouse.radius);
    gl.uniform1f(uniforms.mouseGlowRadius, CFG.mouse.glowRadius);
    gl.uniform1f(uniforms.mousePushStrength, CFG.mouse.pushStrength);
    gl.uniform1f(uniforms.mouseGlowBoost, CFG.mouse.glowBoost);
    gl.uniform1f(uniforms.mouseCrackBoost, CFG.mouse.crackBoost);

    gl.uniform1f(uniforms.creaseAngle, CFG.creaseAngle);
    gl.uniform1f(uniforms.creaseOffset, CFG.creaseOffset);
    gl.uniform1f(uniforms.creaseWidth, CFG.creaseWidth);
    gl.uniform1f(uniforms.creaseStrength, CFG.creaseStrength);
    gl.uniform1f(uniforms.vignetteStart, CFG.vignetteStart);
    gl.uniform1f(uniforms.vignetteEnd, CFG.vignetteEnd);
    gl.uniform1f(uniforms.vignetteStrength, CFG.vignetteStrength);
    gl.uniform1f(uniforms.grainIntensity, CFG.grainIntensity);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.round(canvas.clientWidth * dpr);
    const displayHeight = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  setStaticUniforms();
  resize();

  if (watchThemeToggle) {
    const themeObserver = new MutationObserver(() => {
      targetThemeName = getActiveThemeName();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 100);
  });

  // ── Mouse tracking ──────────────────────────────────────────────────────
  // Position and influence are both eased every frame, never read raw —
  // this avoids stale-velocity artifacts and gives a smooth "push" feel.
  const targetMouse = { x: 0, y: 0 };
  const smoothMouse = { x: 0, y: 0 };
  let mouseActive = false;
  let mouseInfluence = 0;

  function updateTargetMouse(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (canvas.width / rect.width);
    const pyFromTop = (clientY - rect.top) * (canvas.height / rect.height);
    const pyGl = canvas.height - pyFromTop; // flip to match gl_FragCoord's bottom-left origin
    const minDim = Math.min(canvas.width, canvas.height);

    targetMouse.x = (px - 0.5 * canvas.width) / minDim;
    targetMouse.y = (pyGl - 0.5 * canvas.height) / minDim;
  }

  window.addEventListener("pointermove", (e) => {
    updateTargetMouse(e.clientX, e.clientY);
    mouseActive = true;
  });
  window.addEventListener("pointerout", (e) => {
    if (!e.relatedTarget) mouseActive = false; // cursor left the document entirely
  });

  let startTime = performance.now();

  function frame(now) {
    const elapsedSeconds = (now - startTime) / 1000;
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, elapsedSeconds * CFG.motionSpeed);

    mouseInfluence +=
      ((mouseActive ? 1 : 0) - mouseInfluence) * CFG.mouse.influenceSmoothing;
    smoothMouse.x +=
      (targetMouse.x - smoothMouse.x) * CFG.mouse.positionSmoothing;
    smoothMouse.y +=
      (targetMouse.y - smoothMouse.y) * CFG.mouse.positionSmoothing;
    gl.uniform2f(uniforms.mousePos, smoothMouse.x, smoothMouse.y);
    gl.uniform1f(uniforms.mouseInfluence, mouseInfluence);

    if (watchSectionTheme) {
      const blended = computeSectionBlendedColor();
      gl.uniform3fv(uniforms.baseColor, blended.base);
      gl.uniform3fv(uniforms.highlightColor, blended.highlight);
    } else if (watchThemeToggle) {
      updateThemeColors();
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
