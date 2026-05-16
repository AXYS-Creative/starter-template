(function () {
  const canvas = document.getElementById("fluid-bg");

  if (!canvas) return;

  const gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

  if (!gl) {
    console.warn("WebGL not supported — fluid background disabled.");
    return;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const SCALE = 0.5;
    canvas.width = window.innerWidth * dpr * SCALE;
    canvas.height = window.innerHeight * dpr * SCALE;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

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

        /* ── Color palette  */
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
            mix(hash(i),               hash(i + vec2(1., 0.)), f.x),
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
          vec2 uv  = gl_FragCoord.xy / u_res;
          float asp = u_res.x / u_res.y;
 
          vec2 p = uv * vec2(asp, 1.) * 1.1;
          float t = u_time * 0.28;
 
          vec2  mp    = u_mouse * vec2(asp, 1.) * 1.1;
          vec2  delta = p - mp;
          float dist  = length(delta);
          float vortexStr = u_act * exp(-dist * dist * 2.2) * u_swirl;
          float angle     = vortexStr * (1. - smoothstep(0., 1.2, dist));
          float ca = cos(angle), sa = sin(angle);
          vec2  rotDelta = vec2(ca * delta.x - sa * delta.y,
                                sa * delta.x + ca * delta.y);
          vec2  distorted = mp + rotDelta;
          p = mix(p, distorted, u_act * smoothstep(1.4, 0., dist));
 
          /* ── Flow field ── */
          vec2  c    = curl(p, t) * 0.5;
          float flow = fbm(p + c + vec2(0.5, 1.2));
 
          /* ── Large diagonal band layer (the silk-like sweep in the reference) ── */
          float band = fbm(p * vec2(0.6, 0.9) + vec2(2., 0.) + t * 0.12);
 
          /* ── Combine layers ── */
          float f = mix(flow, band, 0.55) + fbm(p * 0.5 + t * 0.07) * 0.18;
          f = clamp(f, 0., 1.);
 
          vec3 col = mix(u_dark,  u_mid,   smoothstep(0.00, 0.50, f));
          col      = mix(col,     u_light, smoothstep(0.42, 0.72, f));
          col      = mix(col,     u_sheen, smoothstep(0.65, 0.88, f) * 0.7);

          /* ── Subtle glow near the mouse ── */
          float mGlow = u_act * exp(-dist * dist * 3.) * 0.18;
          col = mix(col, u_sheen, mGlow);
 
          /* ── Animate Grain ── */
          /* ── float gr = (hash(uv * vec2(1920., 1080.) + mod(floor(u_time * 24.), 1000.) * 31.7) - 0.5) * 0.10; ── */
          float gr = (hash(uv * vec2(1920., 1080.)) - 0.5) * 0.10;
          col += gr;
 
          /* ── Soft vignette — dark corners match the reference ── */
          float vig = 1. - smoothstep(0.45, 0.95, length((uv - 0.5) * vec2(1., 0.9)));
          col *= vig * 0.35 + 0.65;
 
          gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
        }
      `;

  function mkShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  /* ── Read data-* config from canvas element ── */
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

  const cfg = {
    swirl: parseFloat(canvas.dataset.swirl ?? "1.6"),
    dark: hexToVec3(canvas.dataset.colorDark ?? "#050b1f"),
    mid: hexToVec3(canvas.dataset.colorMid ?? "#0e2150"),
    light: hexToVec3(canvas.dataset.colorLight ?? "#296094"),
    sheen: hexToVec3(canvas.dataset.colorSheen ?? "#4279b8"),
  };

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

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uMouse = gl.getUniformLocation(prog, "u_mouse");
  const uAct = gl.getUniformLocation(prog, "u_act");
  const uSwirl = gl.getUniformLocation(prog, "u_swirl"); /* ← add */
  const uDark = gl.getUniformLocation(prog, "u_dark"); /* ← add */
  const uMid = gl.getUniformLocation(prog, "u_mid"); /* ← add */
  const uLight = gl.getUniformLocation(prog, "u_light"); /* ← add */
  const uSheen = gl.getUniformLocation(prog, "u_sheen"); /* ← add */

  let mx = 0.5,
    my = 0.5;
  let tmx = 0.5,
    tmy = 0.5;
  let act = 0,
    tact = 0;
  let lastMove = 0;

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    tmx = (e.clientX - r.left) / r.width;
    tmy = 1 - (e.clientY - r.top) / r.height;
    tact = 1;
    lastMove = performance.now();
  });
  canvas.addEventListener("mouseleave", () => {
    tact = 0;
  });

  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      tmx = (touch.clientX - r.left) / r.width;
      tmy = 1 - (touch.clientY - r.top) / r.height;
      tact = 0.8;
      lastMove = performance.now();
    },
    { passive: false },
  );
  canvas.addEventListener("touchend", () => {
    tact = 0;
  });

  /* ── Render loop ── */
  let start = null;
  let animFrameId = null;
  let paused = false;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      paused = true;
      cancelAnimationFrame(animFrameId);
    } else {
      paused = false;
      start = null;
      animFrameId = requestAnimationFrame(frame);
    }
  });

  function frame(ts) {
    if (!start) start = ts;
    const t = (ts - start) / 1000;

    /* Fade activity out if the mouse has been still for 600 ms */
    if (act > 0 && performance.now() - lastMove > 600) {
      tact = Math.max(0, tact - 0.015);
    }

    /* Lerp mouse position and activity level each frame */
    mx += (tmx - mx) * 0.055;
    my += (tmy - my) * 0.055;
    act += (tact - act) * 0.045;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uAct, act);
    gl.uniform1f(uSwirl, cfg.swirl);
    gl.uniform3fv(uDark, cfg.dark);
    gl.uniform3fv(uMid, cfg.mid);
    gl.uniform3fv(uLight, cfg.light);
    gl.uniform3fv(uSheen, cfg.sheen);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    animFrameId = requestAnimationFrame(frame); // update this line
  }

  animFrameId = requestAnimationFrame(frame); // update this line
})();
