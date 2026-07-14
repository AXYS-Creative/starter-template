// ─────────────────────────────────────────────────────────────────────────
// WebGL background — deep navy field, drifting light lobes, diagonal crease,
// vignette, film grain. Lobes drift and gently form/dissolve at randomized,
// independent rates, and push in the direction of cursor travel. Supports
// two optional theme-reactivity modes (toggle-based and section-scroll
// based), both opt-in via canvas attributes. Grain and crease are static.
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
      sectionStartAttr: "data-canvas-start", // e.g. data-canvas-start="0.5" — single flip threshold (defaults to 0.5)
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

    // Flowing turbulence — a fine sparkling texture, separate from the
    // static base grain, that drifts left-to-right and is masked to only
    // show up in already-lit areas (per the reference clip: the motion
    // reads as fine grain drifting within the bright band, not the big
    // soft gradient itself moving).
    turbulence: {
      speed: 0.0075, // how fast the sparkle drifts left-to-right
      scale: 520.0, // frequency of the speckle (higher = finer grain)
      intensity: 0.08, // brightness of the flowing sparkle
      curlAmount: 0.25, // subtle vertical wobble as it drifts, for an organic (non-straight) flow
      curlScale: 3.5, // spatial frequency of that wobble
    },

    // Mouse interaction — lobes get pushed away from the cursor, and get a
    // local brightness boost near it. Position and influence strength are
    // both eased, never velocity-based.
    mouse: {
      radius: 0.35, // effective radius of cursor influence for push proximity
      glowRadius: 0.25, // size of the light that tracks the cursor (independent of `radius`)
      pushStrength: 0.14, // how far lobes get displaced in the direction of cursor travel
      glowBoost: 0.12, // extra brightness added directly under the cursor
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

  uniform vec2 uMousePos;
  uniform float uMouseInfluence;
  uniform float uMouseRadius;
  uniform float uMouseGlowRadius;
  uniform float uMousePushStrength;
  uniform float uMouseGlowBoost;
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

  uniform float uTurbSpeed;
  uniform float uTurbScale;
  uniform float uTurbIntensity;
  uniform float uTurbCurlAmount;
  uniform float uTurbCurlScale;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }


  void main() {
    // Centered, aspect-normalized coordinate space
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

    // Accumulate drifting, forming/dissolving lobes
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
      float envelope = mix(uLobeFormMin, 1.0, pulse * sqrt(pulse));

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

    // Flowing turbulence — fine sparkle drifting left-to-right, masked to
    // only show up where it's already lit (glow), matching the reference.
    vec2 flowCoord = p * uTurbScale;
    flowCoord.x -= uTime * uTurbSpeed * uTurbScale;
    flowCoord.y += sin(p.x * uTurbCurlScale + uTime * uTurbSpeed * 0.6) * uTurbCurlAmount * uTurbScale;
    float turb = hash(floor(flowCoord));
    color += vec3(turb) * uTurbIntensity * glow;

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

    mousePos: gl.getUniformLocation(program, "uMousePos"),
    mouseInfluence: gl.getUniformLocation(program, "uMouseInfluence"),
    mouseRadius: gl.getUniformLocation(program, "uMouseRadius"),
    mouseGlowRadius: gl.getUniformLocation(program, "uMouseGlowRadius"),
    mousePushStrength: gl.getUniformLocation(program, "uMousePushStrength"),
    mouseGlowBoost: gl.getUniformLocation(program, "uMouseGlowBoost"),
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

    turbSpeed: gl.getUniformLocation(program, "uTurbSpeed"),
    turbScale: gl.getUniformLocation(program, "uTurbScale"),
    turbIntensity: gl.getUniformLocation(program, "uTurbIntensity"),
    turbCurlAmount: gl.getUniformLocation(program, "uTurbCurlAmount"),
    turbCurlScale: gl.getUniformLocation(program, "uTurbCurlScale"),
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

  // ── Section-based scroll theming ────────────────────────────────────────
  // Reads every element with data-canvas-theme, in document order. Each
  // section has a single flip threshold (data-canvas-start, default 0.5)
  // against the same progress metric as before: 0 when the section's top
  // is at the viewport's bottom, 1 when it's reached the viewport's top.
  // The active theme is whichever section, last in document order, has
  // already crossed its threshold — so scrolling back up past it reverts
  // to whatever came before, same as scrolling forward advances it.
  let themeSections = [];

  function parseThreshold(attrValue) {
    const val = parseFloat(attrValue);
    return isNaN(val) ? 0.5 : val;
  }

  function collectThemeSections() {
    const elements = document.querySelectorAll(
      `[${CFG.theme.sectionThemeAttr}]`,
    );
    themeSections = Array.from(elements).map((el) => ({
      el,
      themeName:
        el.getAttribute(CFG.theme.sectionThemeAttr) === "light"
          ? "light"
          : "dark",
      threshold: parseThreshold(el.getAttribute(CFG.theme.sectionStartAttr)),
    }));
  }

  function computeSectionTargetTheme() {
    const viewportHeight = window.innerHeight;
    let active = "dark"; // resting default before any section has triggered
    for (const section of themeSections) {
      const rect = section.el.getBoundingClientRect();
      const rawProgress = Math.min(
        Math.max((viewportHeight - rect.top) / viewportHeight, 0),
        1,
      );
      if (rawProgress >= section.threshold) active = section.themeName;
    }
    return active;
  }

  if (watchSectionTheme) collectThemeSections();

  // Crossfades smoothly between palettes instead of swapping instantly.
  // currentColor holds the live, eased values; targetThemeName is just a
  // cheap cached label updated by whichever mode is active (observer for
  // the toggle, scroll listener for sections) — never a per-frame DOM read.
  let targetThemeName = watchSectionTheme
    ? computeSectionTargetTheme()
    : getActiveThemeName();
  const initialPalette = CFG.colors[targetThemeName];
  const currentColor = {
    base: initialPalette.baseColor.slice(),
    highlight: initialPalette.highlightColor.slice(),
  };

  function updateThemeColors() {
    const target = CFG.colors[targetThemeName];
    let maxDelta = 0;
    for (let i = 0; i < 3; i++) {
      const db = target.baseColor[i] - currentColor.base[i];
      const dh = target.highlightColor[i] - currentColor.highlight[i];
      maxDelta = Math.max(maxDelta, Math.abs(db), Math.abs(dh));
      currentColor.base[i] += db * CFG.theme.transitionSpeed;
      currentColor.highlight[i] += dh * CFG.theme.transitionSpeed;
    }
    // Once converged, stop re-uploading identical values every frame.
    // Resumes automatically the moment targetThemeName changes again.
    if (maxDelta < 0.0008) return;
    gl.uniform3fv(uniforms.baseColor, currentColor.base);
    gl.uniform3fv(uniforms.highlightColor, currentColor.highlight);
  }

  // Scroll/resize-driven, rAF-throttled — only recomputes when the page
  // actually moves, not every animation frame like the old scrub version.
  let sectionThemeUpdateScheduled = false;
  function scheduleSectionThemeUpdate() {
    if (sectionThemeUpdateScheduled) return;
    sectionThemeUpdateScheduled = true;
    requestAnimationFrame(() => {
      targetThemeName = computeSectionTargetTheme();
      sectionThemeUpdateScheduled = false;
    });
  }

  if (watchSectionTheme) {
    window.addEventListener("scroll", scheduleSectionThemeUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleSectionThemeUpdate);
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

    gl.uniform1f(uniforms.mouseRadius, CFG.mouse.radius);
    gl.uniform1f(uniforms.mouseGlowRadius, CFG.mouse.glowRadius);
    gl.uniform1f(uniforms.mousePushStrength, CFG.mouse.pushStrength);
    gl.uniform1f(uniforms.mouseGlowBoost, CFG.mouse.glowBoost);

    gl.uniform1f(uniforms.creaseAngle, CFG.creaseAngle);
    gl.uniform1f(uniforms.creaseOffset, CFG.creaseOffset);
    gl.uniform1f(uniforms.creaseWidth, CFG.creaseWidth);
    gl.uniform1f(uniforms.creaseStrength, CFG.creaseStrength);
    gl.uniform1f(uniforms.vignetteStart, CFG.vignetteStart);
    gl.uniform1f(uniforms.vignetteEnd, CFG.vignetteEnd);
    gl.uniform1f(uniforms.vignetteStrength, CFG.vignetteStrength);
    gl.uniform1f(uniforms.grainIntensity, CFG.grainIntensity);

    gl.uniform1f(uniforms.turbSpeed, CFG.turbulence.speed);
    gl.uniform1f(uniforms.turbScale, CFG.turbulence.scale);
    gl.uniform1f(uniforms.turbIntensity, CFG.turbulence.intensity);
    gl.uniform1f(uniforms.turbCurlAmount, CFG.turbulence.curlAmount);
    gl.uniform1f(uniforms.turbCurlScale, CFG.turbulence.curlScale);
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
    resizeTimeout = setTimeout(() => {
      resize();
      canvasRect = canvas.getBoundingClientRect();
    }, 100);
  });

  // ── Mouse tracking ──────────────────────────────────────────────────────
  // Position and influence are both eased every frame, never read raw —
  // this avoids stale-velocity artifacts and gives a smooth "push" feel.
  const targetMouse = { x: 0, y: 0 };
  const smoothMouse = { x: 0, y: 0 };
  let mouseActive = false;
  let mouseInfluence = 0;

  // Cached instead of read on every pointermove — getBoundingClientRect() is
  // a layout read, and doing that on every mouse event (rather than only
  // when the canvas's actual position could have changed) risks forced
  // reflow on busy pages. Refreshed on resize, where it's already cheap.
  let canvasRect = canvas.getBoundingClientRect();

  function updateTargetMouse(clientX, clientY) {
    const px = (clientX - canvasRect.left) * (canvas.width / canvasRect.width);
    const pyFromTop =
      (clientY - canvasRect.top) * (canvas.height / canvasRect.height);
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

    if (watchThemeToggle || watchSectionTheme) updateThemeColors();

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
