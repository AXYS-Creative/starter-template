import { mqMouse } from "../util.js";

(function () {
  const canvas = document.querySelector(".wisp-bg");

  if (!canvas) return;

  const gl = canvas.getContext("webgl", { alpha: false, antialias: false });

  if (!gl) return;

  /* ─────────────────────────────────────────────────────────────
   CONFIG
   ───────────────────────────────────────────────────────────── */
  const CFG = {
    particleCount: 24000, // safe to push higher now with grid curl
    flowScale: 0.0022,
    flowSpeed: 0.1,
    flowStrength: 1,
    drag: 0.955,
    mouseRadius: 250,
    mouseStrength: 0.85,
    mouseIdleMs: 40,
    mouseBrightness: 0, // brightens/enlarges nearby particles on hover (0 = off, 1 = full)
    mouseSpeedBoost: 0.06, // how much fast mouse movement amplifies scatter force (0 = none)
    maxVelocity: 3.2,
    wrapEdges: false, // true = particles teleport to opposite edge; false = drift back naturally
    gridCols: 48, // curl grid resolution — more cols = smoother field
    gridRows: 27, // 48×27 matches 16:9 aspect, ~1300 noise evals vs ~16000
    bgDriftSpeed: 0.8, // how slowly the background light sweep drifts (0 = static, try 0.1–0.5)
    grainAmount: 0.028, // overall grain intensity (0 = none, 0.028 = subtle, 0.06+ = heavy)
    grainScale: 1.0, // grain size — 1 = fine film grain, 4–8 = coarse sandy texture
    grainLitBoost: 0.016, // extra grain intensity inside the lit sweep area (0 = uniform)
  };

  /* ── Shader compiler ─────────────────────────────────────────── */
  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.warn(gl.getShaderInfoLog(s));
    return s;
  }
  function mkProg(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }

  /* ── Background shader ───────────────────────────────────────── */
  const BG_VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

  const BG_FS = `
precision highp float;
varying vec2 v_uv;
uniform vec2  u_res;
uniform float u_time;
uniform float u_drift;        // pre-scaled time value for background animation
uniform float u_grainAmt;     // overall grain intensity
uniform float u_grainScale;   // grain texel size (1 = 1px, 4 = 4px clumps)
uniform float u_grainLit;     // extra grain in lit areas

float hash(vec2 p) {
  p = fract(p * vec2(234.31, 851.73));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 uvA = vec2(uv.x * aspect, uv.y);

  vec3 col = vec3(0.010, 0.048, 0.118);

  // Each lobe centre drifts on its own slow sine cycle — independent
  // frequencies so they never move in lockstep
  vec2 c1 = vec2(0.18 * aspect + sin(u_drift * 0.7) * 0.18 * aspect,
                 0.28           + cos(u_drift * 0.5) * 0.14);
  vec2 c2 = vec2(0.62 * aspect + cos(u_drift * 0.4) * 0.16 * aspect,
                 0.54           + sin(u_drift * 0.6) * 0.15);
  vec2 cD = vec2(0.05 * aspect + sin(u_drift * 0.3) * 0.12 * aspect,
                 0.88           + cos(u_drift * 0.8) * 0.10);

  float lobe1  = smoothstep(1.05, 0.0, length((uvA - c1) * vec2(0.72, 1.1))) * 0.78;
  float lobe2  = smoothstep(0.90, 0.0, length((uvA - c2) * vec2(1.0,  0.7))) * 0.42;
  float shadow = smoothstep(0.70, 0.0, length((uvA - cD) * vec2(0.85, 0.7))) * 0.55;
  float sweep  = clamp(lobe1 + lobe2 - shadow, 0.0, 1.0);

  col += vec3(0.055, 0.145, 0.320) * sweep;
  col *= 1.0 - smoothstep(0.38, 1.05, length(uv - vec2(0.5))) * 0.80;
  col += (hash(floor(gl_FragCoord.xy / u_grainScale)) * 2.0 - 1.0) * (u_grainAmt + sweep * u_grainLit);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  /* ── Particle shaders ────────────────────────────────────────── */
  const PT_VS = `
attribute vec2  a_pos;
attribute float a_size;
attribute float a_alpha;
uniform vec2 u_res;
varying float v_alpha;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = a_size;
  v_alpha = a_alpha;
}`;

  const PT_FS = `
precision mediump float;
uniform vec3 u_color;
varying float v_alpha;
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float d = length(pc);
  float mask = exp(-d*d*20.0) + exp(-d*d*5.5)*0.22;
  if (mask * v_alpha < 0.004) discard;
  gl_FragColor = vec4(u_color, mask * v_alpha);
}`;

  /* ── Compile ─────────────────────────────────────────────────── */
  const bgProg = mkProg(BG_VS, BG_FS);
  const ptProg = mkProg(PT_VS, PT_FS);

  const bg_aPos = gl.getAttribLocation(bgProg, "a_pos");
  const bg_uRes = gl.getUniformLocation(bgProg, "u_res");
  const bg_uTime = gl.getUniformLocation(bgProg, "u_time");
  const bg_uDrift = gl.getUniformLocation(bgProg, "u_drift");
  const bg_uGrainAmt = gl.getUniformLocation(bgProg, "u_grainAmt");
  const bg_uGrainScl = gl.getUniformLocation(bgProg, "u_grainScale");
  const bg_uGrainLit = gl.getUniformLocation(bgProg, "u_grainLit");

  const pt_aPos = gl.getAttribLocation(ptProg, "a_pos");
  const pt_aSize = gl.getAttribLocation(ptProg, "a_size");
  const pt_aAlpha = gl.getAttribLocation(ptProg, "a_alpha");
  const pt_uRes = gl.getUniformLocation(ptProg, "u_res");
  const pt_uColor = gl.getUniformLocation(ptProg, "u_color");

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  /* ── Particle state ──────────────────────────────────────────── */
  const N = CFG.particleCount;

  // Interleaved VBO: [x, y, size, alpha] per particle — 4 floats × N
  // One bufferData call per frame instead of three.
  const STRIDE = 4; // floats per particle
  const vbo = new Float32Array(N * STRIDE);
  const OFF_X = 0,
    OFF_Y = 1,
    OFF_SZ = 2,
    OFF_AL = 3;

  // Simulation-only arrays (never uploaded to GPU)
  const vx = new Float32Array(N);
  const vy = new Float32Array(N);
  const phase = new Float32Array(N);
  const drift = new Float32Array(N);
  const life = new Float32Array(N);
  const bAlpha = new Float32Array(N);
  const bSize = new Float32Array(N);

  const bufVBO = gl.createBuffer();

  let W = 0,
    H = 0;
  let mx = -1,
    my = -1,
    pmx = -1,
    pmy = -1;
  let mouseSpeed = 0; // px/frame magnitude of last mouse movement
  let mouseActive = false;
  let lastMoveTime = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function initP(i) {
    const base = i * STRIDE;
    vbo[base + OFF_X] = rand(0, W || window.innerWidth);
    vbo[base + OFF_Y] = rand(0, H || window.innerHeight);
    vx[i] = rand(-0.2, 0.2);
    vy[i] = rand(-0.2, 0.2);
    phase[i] = rand(0, Math.PI * 2);
    drift[i] = rand(0.6, 1.4);
    life[i] = rand(0, 1);
    const sz = Math.random();
    bSize[i] =
      sz < 0.62 ? rand(0.9, 2.2) : sz < 0.88 ? rand(2.2, 4.8) : rand(4.8, 8.5);
    bAlpha[i] = rand(0.05, 0.52) * (bSize[i] < 2.2 ? 0.5 : 1.0);
    vbo[base + OFF_SZ] = bSize[i];
    vbo[base + OFF_AL] = 0;
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    gl.viewport(0, 0, W, H);
    for (let i = 0; i < N; i++) initP(i);
  }

  // Greater than 520 so it doesn't refresh on  mobile(dvh)
  if (window.innerWidth > 520 && mqMouse) {
    window.addEventListener("resize", resize);
  }
  resize();

  window.addEventListener("mousemove", (e) => {
    pmx = mx;
    pmy = my;
    mx = e.clientX;
    my = e.clientY;
    // Only compute speed when we have a valid prior position
    mouseSpeed = pmx < 0 ? 0 : Math.sqrt((mx - pmx) ** 2 + (my - pmy) ** 2);
    mouseActive = true;
    lastMoveTime = performance.now();
  });
  window.addEventListener("mouseleave", () => {
    mx = -1;
    my = -1;
    pmx = -1;
    pmy = -1;
    mouseSpeed = 0;
    mouseActive = false;
    lastMoveTime = 0;
  });

  /* ── Perlin noise ────────────────────────────────────────────── */
  const perm = new Uint8Array(512);
  (function () {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function grad(h, x, y, z) {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return (h & 1 ? -u : u) + (h & 2 ? -v : v);
  }
  function lerp(a, b, t) {
    return a + t * (b - a);
  }
  function noise3(x, y, z) {
    const X = Math.floor(x) & 255,
      Y = Math.floor(y) & 255,
      Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x),
      v = fade(y),
      w = fade(z);
    const A = perm[X] + Y,
      AA = perm[A] + Z,
      AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y,
      BA = perm[B] + Z,
      BB = perm[B + 1] + Z;
    return lerp(
      lerp(
        lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
        lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
        v,
      ),
      lerp(
        lerp(
          grad(perm[AA + 1], x, y, z - 1),
          grad(perm[BA + 1], x - 1, y, z - 1),
          u,
        ),
        lerp(
          grad(perm[AB + 1], x, y - 1, z - 1),
          grad(perm[BB + 1], x - 1, y - 1, z - 1),
          u,
        ),
        v,
      ),
      w,
    );
  }

  /* ── Curl grid ───────────────────────────────────────────────────
   Pre-compute a cols×rows grid of curl vectors once per frame.
   Each particle bilinearly interpolates from its 4 nearest cells.
   Cost: (cols+1)×(rows+1)×2 noise calls per frame, regardless of N.
   At 48×27 that's ~2,450 calls vs N×2 = 16,000 at 8k particles.
   ─────────────────────────────────────────────────────────────── */
  const GCOLS = CFG.gridCols;
  const GROWS = CFG.gridRows;
  // +1 in each dimension so edge particles can interpolate safely
  const gridCX = new Float32Array((GCOLS + 1) * (GROWS + 1));
  const gridCY = new Float32Array((GCOLS + 1) * (GROWS + 1));
  const EPS = 0.015;

  function buildCurlGrid(ft) {
    const fs = CFG.flowScale;
    for (let row = 0; row <= GROWS; row++) {
      for (let col = 0; col <= GCOLS; col++) {
        // Map grid cell to the same noise-space coordinates particles use
        const nx = (col / GCOLS) * W * fs;
        const ny = (row / GROWS) * H * fs;
        const idx = row * (GCOLS + 1) + col;
        gridCX[idx] =
          (noise3(nx, ny + EPS, ft) - noise3(nx, ny - EPS, ft)) / (2 * EPS);
        gridCY[idx] =
          -(noise3(nx + EPS, ny, ft) - noise3(nx - EPS, ny, ft)) / (2 * EPS);
      }
    }
  }

  function sampleCurl(px, py) {
    // Wrap position into 0..W / 0..H before mapping to grid
    // so particles in the -15px border zone still get a valid sample
    const wx = ((px % W) + W) % W;
    const wy = ((py % H) + H) % H;

    const gx = Math.min((wx / W) * GCOLS, GCOLS - 0.001);
    const gy = Math.min((wy / H) * GROWS, GROWS - 0.001);

    const col0 = Math.floor(gx),
      col1 = col0 + 1;
    const row0 = Math.floor(gy),
      row1 = row0 + 1;
    const tx = gx - col0,
      ty = gy - row0;

    const i00 = row0 * (GCOLS + 1) + col0;
    const i10 = row0 * (GCOLS + 1) + col1;
    const i01 = row1 * (GCOLS + 1) + col0;
    const i11 = row1 * (GCOLS + 1) + col1;

    const cx = lerp(
      lerp(gridCX[i00], gridCX[i10], tx),
      lerp(gridCX[i01], gridCX[i11], tx),
      ty,
    );
    const cy = lerp(
      lerp(gridCY[i00], gridCY[i10], tx),
      lerp(gridCY[i01], gridCY[i11], tx),
      ty,
    );
    return { cx, cy };
  }

  const SR = CFG.mouseRadius;
  const SR2 = SR * SR;

  /* ── Main loop ───────────────────────────────────────────────── */
  function tick(ts) {
    requestAnimationFrame(tick);
    const t = ts * 0.001;
    const ft = t * CFG.flowSpeed;

    /* Build curl grid once for this frame — all particles share it */
    buildCurlGrid(ft);

    const idleMs = performance.now() - lastMoveTime;
    const mouseWeight = mouseActive
      ? Math.max(0, 1 - idleMs / CFG.mouseIdleMs)
      : 0;

    for (let i = 0; i < N; i++) {
      const base = i * STRIDE;
      let px = vbo[base + OFF_X],
        py = vbo[base + OFF_Y];

      /* ── Sample pre-built grid instead of calling noise per particle ── */
      const { cx, cy } = sampleCurl(px, py);
      vx[i] += cx * CFG.flowStrength * drift[i] * 0.016;
      vy[i] += cy * CFG.flowStrength * drift[i] * 0.016;

      /* ── Mouse scatter ── */
      if (mouseWeight > 0 && mx > 0) {
        const ex = px - mx,
          ey = py - my;
        const d2 = ex * ex + ey * ey;
        if (d2 < SR2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const fo = (1.0 - d / SR) * mouseWeight;
          const speedF = 1.0 + mouseSpeed * CFG.mouseSpeedBoost;
          const f = fo * fo * CFG.mouseStrength * speedF;
          vx[i] += (ex / d) * f;
          vy[i] += (ey / d) * f;
        }
      }

      /* ── Damping + cap ── */
      vx[i] *= CFG.drag;
      vy[i] *= CFG.drag;
      const spd_ = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      if (spd_ > CFG.maxVelocity) {
        const inv = CFG.maxVelocity / spd_;
        vx[i] *= inv;
        vy[i] *= inv;
      }

      px += vx[i];
      py += vy[i];

      // NaN/Infinity guard — if a particle escapes numerically, reinitialise it
      if (!isFinite(px) || !isFinite(py)) {
        initP(i);
        continue;
      }

      if (CFG.wrapEdges) {
        if (px < -15) px += W + 15;
        else if (px > W + 15) px -= W + 15;
        if (py < -15) py += H + 15;
        else if (py > H + 15) py -= H + 15;
      } else {
        // Let particles drift offscreen freely — but if they've wandered more
        // than one full screen-length away they'll never come back on their own,
        // so respawn them just outside a random edge to re-enter naturally.
        const margin = 120;
        if (
          px < -margin ||
          px > W + margin ||
          py < -margin ||
          py > H + margin
        ) {
          // Pick a random edge (0=top, 1=right, 2=bottom, 3=left) and place
          // the particle just outside it with low inward-biased velocity
          const edge = Math.floor(Math.random() * 4);
          if (edge === 0) {
            px = rand(0, W);
            py = -10;
            vy[i] = Math.abs(vy[i]) * 0.3;
          } else if (edge === 1) {
            px = W + 10;
            py = rand(0, H);
            vx[i] = -Math.abs(vx[i]) * 0.3;
          } else if (edge === 2) {
            px = rand(0, W);
            py = H + 10;
            vy[i] = -Math.abs(vy[i]) * 0.3;
          } else {
            px = -10;
            py = rand(0, H);
            vx[i] = Math.abs(vx[i]) * 0.3;
          }
        }
      }

      /* ── Shimmer ── */
      life[i] += drift[i] * 0.00035;
      if (life[i] > 1) life[i] -= 1;
      const lf = life[i] < 0.5 ? life[i] * 2 : (1 - life[i]) * 2;

      let mb = 0;
      if (CFG.mouseBrightness > 0 && mouseWeight > 0 && mx > 0) {
        const ex = px - mx,
          ey = py - my;
        const d2 = ex * ex + ey * ey;
        if (d2 < SR2 * 4)
          mb =
            Math.max(0, 1 - Math.sqrt(d2) / (SR * 2)) *
            mouseWeight *
            CFG.mouseBrightness;
      }

      const litBias = Math.max(0, 1.0 - (px / W) * 1.2 - (py / H) * 0.5) * 0.6;

      // Write all four values into interleaved vbo in one pass
      vbo[base + OFF_X] = px;
      vbo[base + OFF_Y] = py;
      vbo[base + OFF_SZ] = bSize[i] * (0.88 + lf * 0.12) + mb * bSize[i] * 0.32;
      vbo[base + OFF_AL] =
        bAlpha[i] * (0.42 + lf * 0.58) * (1 + litBias) + mb * 0.28;
    }

    /* ── Pass 1: background ── */
    gl.disable(gl.BLEND);
    gl.useProgram(bgProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(bg_aPos);
    gl.vertexAttribPointer(bg_aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(bg_uRes, W, H);
    gl.uniform1f(bg_uTime, t);
    gl.uniform1f(bg_uDrift, t * CFG.bgDriftSpeed);
    gl.uniform1f(bg_uGrainAmt, CFG.grainAmount);
    gl.uniform1f(bg_uGrainScl, CFG.grainScale);
    gl.uniform1f(bg_uGrainLit, CFG.grainLitBoost);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    /* ── Pass 2: particles ── */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(ptProg);

    // Single upload — all particle data in one call
    const BYTES = STRIDE * 4; // 4 bytes per float
    gl.bindBuffer(gl.ARRAY_BUFFER, bufVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vbo, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(pt_aPos);
    gl.vertexAttribPointer(pt_aPos, 2, gl.FLOAT, false, BYTES, OFF_X * 4);

    gl.enableVertexAttribArray(pt_aSize);
    gl.vertexAttribPointer(pt_aSize, 1, gl.FLOAT, false, BYTES, OFF_SZ * 4);

    gl.enableVertexAttribArray(pt_aAlpha);
    gl.vertexAttribPointer(pt_aAlpha, 1, gl.FLOAT, false, BYTES, OFF_AL * 4);

    gl.uniform2f(pt_uRes, W, H);
    gl.uniform3f(pt_uColor, 0.4, 0.58, 0.9);
    gl.drawArrays(gl.POINTS, 0, N);
  }

  requestAnimationFrame(tick);
})();
