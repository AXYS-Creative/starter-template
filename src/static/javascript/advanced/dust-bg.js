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
    // Base + highlight colors (base = deep corners, highlight = glow color)
    baseColor: css("#040d1f"),
    highlightColor: css("#3d5f8a"),

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
    motionSpeed: 2.25,

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
    grainIntensity: 0.075,
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

      float d = length(p - pos);
      float g = exp(-(d * d) / (2.0 * uLobeRadius[i] * uLobeRadius[i]));

      float pulse = 0.5 + 0.5 * sin(uTime * uLobeFormFreq[i] + uLobeFormPhase[i]);
      float envelope = mix(uLobeFormMin, 1.0, pow(pulse, 1.5));

      totalLobe += g * envelope;
    }

    // Soft clamp so overlapping lobes don't blow out to flat white
    float glow = 1.0 - exp(-totalLobe);
    vec3 color = mix(uBaseColor, uHighlightColor, clamp(glow, 0.0, 1.0));

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

  function setStaticUniforms() {
    gl.uniform3fv(uniforms.baseColor, CFG.baseColor);
    gl.uniform3fv(uniforms.highlightColor, CFG.highlightColor);

    gl.uniform2fv(uniforms.lobeBasePos, lobeParams.basePos);
    gl.uniform2fv(uniforms.lobeDriftFreq, lobeParams.driftFreq);
    gl.uniform2fv(uniforms.lobePhase, lobeParams.phase);
    gl.uniform1fv(uniforms.lobeDriftAmp, lobeParams.driftAmp);
    gl.uniform1fv(uniforms.lobeRadius, lobeParams.radius);
    gl.uniform1fv(uniforms.lobeFormFreq, lobeParams.formFreq);
    gl.uniform1fv(uniforms.lobeFormPhase, lobeParams.formPhase);
    gl.uniform1f(uniforms.lobeFormMin, CFG.lobes.formMin);
    gl.uniform1i(uniforms.lobeCount, Math.min(CFG.lobes.count, MAX_LOBES));

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

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 100);
  });

  let startTime = performance.now();

  function frame(now) {
    const elapsedSeconds = (now - startTime) / 1000;
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, elapsedSeconds * CFG.motionSpeed);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
