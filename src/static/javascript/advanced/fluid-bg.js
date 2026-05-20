(function () {
  // ─── Shared shader source (compiled once per canvas context) ───────────────

  const vertSrc = `
    attribute vec2 a;
    void main() { gl_Position = vec4(a, 0., 1.); }
  `;

  const fragSrc = `
    precision highp float;

    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_mouse;
    uniform float u_act;
    uniform float u_swirl;
    uniform vec2  u_push;
    uniform float u_push_radius;
    uniform float u_grain;

    /* ── Color palette ── */
    uniform vec3 u_dark;
    uniform vec3 u_mid;
    uniform vec3 u_light;
    uniform vec3 u_sheen;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3. - 2. * f);
      return mix(
        mix(hash(i),                hash(i + vec2(1., 0.)), f.x),
        mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x),
        f.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.;
      float a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p  = rot * p * 2.;
        a *= 0.48;
      }
      return v;
    }

    vec2 curl(vec2 p, float t) {
      float e = 0.015;
      float a = fbm(p + vec2(0., e) + t * 0.05) - fbm(p - vec2(0., e) + t * 0.05);
      float b = fbm(p + vec2(e, 0.) + t * 0.05) - fbm(p - vec2(e, 0.) + t * 0.05);
      return vec2(a, -b) / (2. * e);
    }

    void main() {
      vec2  uv  = gl_FragCoord.xy / u_res;
      float asp = u_res.x / u_res.y;

      vec2  p = uv * vec2(asp, 1.) * 1.1;
      float t = u_time * 0.28;

      /* ── Mouse interaction ── */
      vec2  mp    = u_mouse * vec2(asp, 1.) * 1.1;
      vec2  delta = p - mp;
      float dist  = length(delta);

      /* swirl mode — rotate sampling point around cursor */
      float vortexStr = u_act * exp(-dist * dist * 2.2) * u_swirl;
      float angle     = vortexStr * (1. - smoothstep(0., 1.2, dist));
      float ca        = cos(angle), sa = sin(angle);
      vec2  rotDelta  = vec2(ca * delta.x - sa * delta.y,
                            sa * delta.x + ca * delta.y);
      vec2  distorted = mp + rotDelta;
      p = mix(p, distorted, u_act * smoothstep(1.4, 0., dist));

      /* push mode — displace sampling point by velocity, falloff from cursor */
      float pushRadius = exp(-dist * dist * u_push_radius);
      p += u_push * pushRadius * u_act;

      /* ── Flow field ── */
      vec2  c    = curl(p, t) * 0.5;
      float flow = fbm(p + c + vec2(0.5, 1.2));

      /* ── Large diagonal band layer ── */
      float band = fbm(p * vec2(0.6, 0.9) + vec2(2., 0.) + t * 0.12);

      /* ── Combine layers ── */
      float f = mix(flow, band, 0.55) + fbm(p * 0.5 + t * 0.07) * 0.18;
      f = clamp(f, 0., 1.);

      /* ── Color mixing ── */
      vec3 col = mix(u_dark,  u_mid,   smoothstep(0.00, 0.50, f));
      col      = mix(col,     u_light, smoothstep(0.42, 0.72, f));
      col      = mix(col,     u_sheen, smoothstep(0.65, 0.88, f) * 0.7);

      /* ── Subtle glow near the mouse ── */
      float mGlow = u_act * exp(-dist * dist * 3.) * 0.18;
      col = mix(col, u_sheen, mGlow);

      /* ── Stationary grain ── */
      float gr = (hash(uv * vec2(1920., 1080.)) - 0.5) * u_grain;
      col += gr;

      /* ── Soft vignette ── */
      float vig = 1. - smoothstep(0.45, 0.95, length((uv - 0.5) * vec2(1., 0.9)));
      col *= vig * 0.35 + 0.65;

      gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
    }
  `;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function hexToVec3(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    const n = parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function mkShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(s));
    }
    return s;
  }

  // ─── Per-canvas initialisation ─────────────────────────────────────────────

  function initCanvas(canvas) {
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      console.warn("WebGL not supported — fluid background disabled.", canvas);
      return null;
    }

    // Compile & link
    const prog = gl.createProgram();
    gl.attachShader(prog, mkShader(gl, gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(prog, mkShader(gl, gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Read data-* config with fallback defaults
    const cfg = {
      swirl: parseFloat(canvas.dataset.swirl ?? "1.2"),
      mouseStyle: canvas.dataset.mouseStyle ?? "swirl",
      pushStrength: parseFloat(canvas.dataset.pushStrength ?? "8.0"),
      pushRadius: parseFloat(canvas.dataset.pushRadius ?? "1.8"),
      grain: parseFloat(canvas.dataset.grain ?? "0.10"),
      dark: hexToVec3(canvas.dataset.colorDark ?? "#050b1f"),
      mid: hexToVec3(canvas.dataset.colorMid ?? "#0e2150"),
      light: hexToVec3(canvas.dataset.colorLight ?? "#296094"),
      sheen: hexToVec3(canvas.dataset.colorSheen ?? "#4279b8"),
    };

    // Geometry — full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aLoc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uAct = gl.getUniformLocation(prog, "u_act");
    const uSwirl = gl.getUniformLocation(prog, "u_swirl");
    const uPush = gl.getUniformLocation(prog, "u_push");
    const uPushRadius = gl.getUniformLocation(prog, "u_push_radius");
    const uGrain = gl.getUniformLocation(prog, "u_grain");
    const uDark = gl.getUniformLocation(prog, "u_dark");
    const uMid = gl.getUniformLocation(prog, "u_mid");
    const uLight = gl.getUniformLocation(prog, "u_light");
    const uSheen = gl.getUniformLocation(prog, "u_sheen");

    // Static uniforms — set once, never change per-frame
    gl.uniform1f(uSwirl, cfg.swirl);
    gl.uniform1f(uGrain, cfg.grain);
    gl.uniform1f(gl.getUniformLocation(prog, "u_push_radius"), cfg.pushRadius);
    gl.uniform3fv(uDark, cfg.dark);
    gl.uniform3fv(uMid, cfg.mid);
    gl.uniform3fv(uLight, cfg.light);
    gl.uniform3fv(uSheen, cfg.sheen);

    return {
      canvas,
      gl,
      cfg,
      uRes,
      uTime,
      uMouse,
      uAct,
      uPush,
      uPushRadius,
      mx: 0.5,
      my: 0.5,
      tmx: 0.5,
      tmy: 0.5,
      act: 0,
      tact: 0,
      lastMove: 0,
      pvx: 0,
      pvy: 0,
      pmx: 0.5,
      pmy: 0.5,
    };
  }

  // ─── Per-canvas event binding ──────────────────────────────────────────────

  function bindEvents(inst) {
    const { canvas } = inst;

    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      inst.tmx = (e.clientX - r.left) / r.width;
      inst.tmy = 1 - (e.clientY - r.top) / r.height;
      inst.tact = 1;
      inst.lastMove = performance.now();
    });

    canvas.addEventListener("mouseleave", () => {
      inst.tact = 0;
    });

    canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        inst.tmx = (touch.clientX - r.left) / r.width;
        inst.tmy = 1 - (touch.clientY - r.top) / r.height;
        inst.tact = 0.8;
        inst.lastMove = performance.now();
      },
      { passive: false },
    );

    canvas.addEventListener("touchend", () => {
      inst.tact = 0;
    });
  }

  // ─── Shared resize — uses each canvas's own offset dimensions ─────────────

  function resizeAll() {
    instances.forEach(({ canvas, gl }) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const SCALE = 0.5;
      canvas.width = canvas.offsetWidth * dpr * SCALE;
      canvas.height = canvas.offsetHeight * dpr * SCALE;
      gl.viewport(0, 0, canvas.width, canvas.height);
    });
  }

  // ─── Shared render loop — one rAF drives all instances ────────────────────

  const instances = [];
  let start = null;
  let animFrameId = null;

  function frame(ts) {
    if (!start) start = ts;
    const t = (ts - start) / 1000;

    instances.forEach((inst) => {
      const { gl, canvas, uRes, uTime, uMouse, uAct } = inst;

      // Fade activity if mouse has been still for 600ms
      if (inst.act > 0 && performance.now() - inst.lastMove > 600)
        inst.tact = Math.max(0, inst.tact - 0.015);

      // Lerp mouse position and activity
      inst.mx += (inst.tmx - inst.mx) * 0.055;
      inst.my += (inst.tmy - inst.my) * 0.055;
      inst.act += (inst.tact - inst.act) * 0.045;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);

      if (inst.cfg.mouseStyle === "push") {
        inst.pvx += (inst.mx - inst.pmx - inst.pvx) * 0.18;
        inst.pvy += (inst.my - inst.pmy - inst.pvy) * 0.18;
        inst.pmx = inst.mx;
        inst.pmy = inst.my;
        gl.uniform2f(uMouse, inst.mx, inst.my);
        gl.uniform2f(
          inst.uPush,
          -inst.pvx * inst.cfg.pushStrength,
          -inst.pvy * inst.cfg.pushStrength,
        );
        gl.uniform1f(uAct, inst.act);
      } else if (inst.cfg.mouseStyle === "none") {
        gl.uniform2f(uMouse, 0.5, 0.5);
        gl.uniform2f(inst.uPush, 0.0, 0.0);
        gl.uniform1f(uAct, 0.0);
      } else {
        // default: "swirl"
        gl.uniform2f(uMouse, inst.mx, inst.my);
        gl.uniform2f(inst.uPush, 0.0, 0.0);
        gl.uniform1f(uAct, inst.act);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

    animFrameId = requestAnimationFrame(frame);
  }

  // ─── Visibility — pause/resume the single shared loop ─────────────────────

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrameId);
    } else {
      start = null; // prevent time jump on resume
      animFrameId = requestAnimationFrame(frame);
    }
  });

  // ─── Boot — find all .fluid-bg canvases and initialise ────────────────────

  document.querySelectorAll("canvas.fluid-bg").forEach((canvas) => {
    const inst = initCanvas(canvas);
    if (!inst) return;
    bindEvents(inst);
    instances.push(inst);
  });

  if (instances.length === 0) return;

  window.addEventListener("resize", resizeAll);
  resizeAll();

  animFrameId = requestAnimationFrame(frame);
})();
