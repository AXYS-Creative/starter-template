/**
 * Vanilla WebGL Persistent Particle GPGPU Simulation
 * Configurable via HTML5 Data Attributes.
 * Expanded orbital structures to fully flood viewport boundaries and corners.
 */

(function () {
  const canvas = document.getElementById("dust-bg");
  if (!canvas) return;

  const gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    console.error("WebGL not supported.");
    return;
  }

  // --- Dynamic Attribute Configurations ---
  // Read user properties from HTML, fallback to safe structural defaults if empty
  const PARTICLE_COUNT =
    parseInt(canvas.getAttribute("data-particle-count")) || 9000;
  const BASE_SIZE =
    parseFloat(canvas.getAttribute("data-particle-size")) || 0.5;
  const FORCE_MASS =
    parseFloat(canvas.getAttribute("data-particle-mass")) || 10.0;

  const SMOOTHING_FACTOR = 0.04; // Delay tracking inertia

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  let targetMouse = { x: 0, y: 0 };
  let currentMouse = { x: 0, y: 0 };
  let prevMouse = { x: 0, y: 0 };
  let mouseVelocity = { x: 0, y: 0 };
  let startTime = performance.now();

  // --- Shader Sources ---

  const bgVertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
            v_uv = a_position * 0.5 + 0.5;
            v_uv.y = 1.0 - v_uv.y;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

  const bgFragmentShaderSource = `
        precision mediump float;
        varying vec2 v_uv;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform vec2 u_resolution;

        void main() {
            vec2 uv = v_uv;
            float aspect = u_resolution.x / u_resolution.y;
            vec2 uv_aspect = vec2(uv.x * aspect, uv.y);

            float wave1 = sin(uv_aspect.x * 1.5 + u_time * 0.08) * 0.4;
            float wave2 = cos(uv_aspect.y * 2.0 - u_time * 0.06) * 0.3;
            
            float mouseDist = length(uv - (u_mouse * 0.5 + 0.5));
            float mouseInfluence = smoothstep(0.6, 0.0, mouseDist) * 0.04;
            
            float diagonalRidge = uv.x + uv.y * 0.8 + wave1 + wave2 + mouseInfluence;
            float glowLine = smoothstep(1.3, 0.7, diagonalRidge) * smoothstep(0.2, 0.8, diagonalRidge);

            vec3 navyBackground = vec3(0.007, 0.043, 0.117); 
            vec3 cobaltMid = vec3(0.0, 0.168, 0.4);         
            vec3 electricGlow = vec3(0.0, 0.333, 0.701);     

            vec3 baseGradient = mix(navyBackground, cobaltMid, uv.y);
            vec3 finalColor = mix(baseGradient, electricGlow, glowLine * 0.85);

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

  const particleVertexShaderSource = `
        attribute vec4 a_particleConfig; // x: radius, y: angle offset, z: speed seed, w: size seed
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform vec2 u_mouseVel;
        uniform float u_aspect;
        
        // Configuration Uniforms passed from data attributes
        uniform float u_baseSize;
        uniform float u_massFactor;
        
        varying float v_opacity;

        void main() {
            float orbitRadius = a_particleConfig.x;
            float angleOffset = a_particleConfig.y;
            float speedSeed = a_particleConfig.z;
            float sizeSeed = a_particleConfig.w;

            // --- CYCLONIC VORTEX MECHANICS ---
            float rotationSpeed = 0.03 + speedSeed * 0.04;
            float currentAngle = angleOffset + (u_time * rotationSpeed);

            // Compute the elliptical position matrix. 
            // Scaled dynamically by aspect ratio to sweep far past view edges into corners.
            vec2 orbitalPos = vec2(
                cos(currentAngle) * orbitRadius * (u_aspect * 1.1),
                sin(currentAngle) * orbitRadius * 1.2 + (cos(currentAngle) * 0.25)
            );

            // Micro-current atmospheric drift noise
            orbitalPos.x += sin(u_time * 0.4 + angleOffset) * 0.04;
            orbitalPos.y += cos(u_time * 0.3 + orbitRadius) * 0.03;

            // --- KINETIC MOUSE WAKE ---
            vec2 currentPos = orbitalPos;
            vec2 mouseDiff = currentPos - u_mouse;
            mouseDiff.x *= u_aspect; 
            float dist = length(mouseDiff);

            float activeRadius = 0.45; 
            if (dist < activeRadius) {
                float pushForce = smoothstep(activeRadius, 0.01, dist);
                
                vec2 pushVector = normalize(mouseDiff);
                vec2 swirlVector = vec2(-pushVector.y, pushVector.x);
                
                // Incorporate mass attribute scaling to intensify/dampen displacement ranges
                float dynamicPush = 0.02 * u_massFactor;
                float dynamicVel  = 0.035 * u_massFactor;

                vec2 escapeVelocity = mix(pushVector, swirlVector, 0.4) * pushForce * dynamicPush;
                escapeVelocity += u_mouseVel * pushForce * dynamicVel;

                currentPos += escapeVelocity;
            }

            // --- USER SIZE SCALING ENGINE ---
            // Scaled globally by data-particle-size parameter
            gl_PointSize = u_baseSize * (1.5 + sizeSeed * 3.5);

            // Volumetric transparency mapping based on edge depth boundaries
            float maxDisplacement = max(abs(currentPos.x) / u_aspect, abs(currentPos.y));
            v_opacity = smoothstep(2.0, 0.8, maxDisplacement) * (0.15 + sizeSeed * 0.55);

            gl_Position = vec4(currentPos, 0.0, 1.0);
        }
    `;

  const particleFragmentShaderSource = `
        precision mediump float;
        varying float v_opacity;

        void main() {
            vec2 ptCoord = gl_PointCoord - vec2(0.5);
            if (length(ptCoord) > 0.5) discard;
            gl_FragColor = vec4(0.82, 0.92, 1.0, v_opacity);
        }
    `;

  // --- WebGL Compiler Engines ---
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function createProgram(gl, vsSource, fsSource) {
    return gl.createProgram() || null;
  }

  // Direct initialization setup mapping
  const vsBg = createShader(gl, gl.VERTEX_SHADER, bgVertexShaderSource);
  const fsBg = createShader(gl, gl.FRAGMENT_SHADER, bgFragmentShaderSource);
  const bgProgram = gl.createProgram();
  gl.attachShader(bgProgram, vsBg);
  gl.attachShader(bgProgram, fsBg);
  gl.linkProgram(bgProgram);

  const vsPt = createShader(gl, gl.VERTEX_SHADER, particleVertexShaderSource);
  const fsPt = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    particleFragmentShaderSource,
  );
  const particleProgram = gl.createProgram();
  gl.attachShader(particleProgram, vsPt);
  gl.attachShader(particleProgram, fsPt);
  gl.linkProgram(particleProgram);

  const bgBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bgBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  // --- Build Expanded Config Buffers ---
  // Expanded limits to spread particle parameters further outward beyond boundaries
  const particleConfigData = new Float32Array(PARTICLE_COUNT * 4);
  for (let i = 0; i < PARTICLE_COUNT * 4; i += 4) {
    particleConfigData[i] = 0.05 + Math.random() * 1.9; // Expanded orbital radiuses (Floods outside viewport)
    particleConfigData[i + 1] = Math.random() * Math.PI * 2.0;
    particleConfigData[i + 2] = Math.random();
    particleConfigData[i + 3] = Math.random();
  }

  const particleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particleConfigData, gl.STATIC_DRAW);

  // --- Mouse Input Bindings ---
  window.addEventListener("mousemove", (e) => {
    targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // --- Render Loop Engine ---
  function render() {
    mouseVelocity.x = targetMouse.x - prevMouse.x;
    mouseVelocity.y = targetMouse.y - prevMouse.y;

    prevMouse.x = targetMouse.x;
    prevMouse.y = targetMouse.y;

    currentMouse.x += (targetMouse.x - currentMouse.x) * SMOOTHING_FACTOR;
    currentMouse.y += (targetMouse.y - currentMouse.y) * SMOOTHING_FACTOR;

    const currentTime = (performance.now() - startTime) * 0.001;
    const aspect = width / height;

    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // STAGE 1: Background Gradient Base Quad
    gl.useProgram(bgProgram);
    const bgPosLoc = gl.getAttribLocation(bgProgram, "a_position");
    gl.enableVertexAttribArray(bgPosLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, bgBuffer);
    gl.vertexAttribPointer(bgPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(gl.getUniformLocation(bgProgram, "u_time"), currentTime);
    gl.uniform2f(
      gl.getUniformLocation(bgProgram, "u_mouse"),
      currentMouse.x,
      currentMouse.y,
    );
    gl.uniform2f(
      gl.getUniformLocation(bgProgram, "u_resolution"),
      width,
      height,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // STAGE 2: Particle Layer Simulation
    gl.useProgram(particleProgram);
    const particleConfigLoc = gl.getAttribLocation(
      particleProgram,
      "a_particleConfig",
    );
    gl.enableVertexAttribArray(particleConfigLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.vertexAttribPointer(particleConfigLoc, 4, gl.FLOAT, false, 0, 0);

    // Assign core uniform inputs mapped from data-attributes
    gl.uniform1f(gl.getUniformLocation(particleProgram, "u_time"), currentTime);
    gl.uniform2f(
      gl.getUniformLocation(particleProgram, "u_mouse"),
      currentMouse.x,
      currentMouse.y,
    );
    gl.uniform2f(
      gl.getUniformLocation(particleProgram, "u_mouseVel"),
      mouseVelocity.x,
      mouseVelocity.y,
    );
    gl.uniform1f(gl.getUniformLocation(particleProgram, "u_aspect"), aspect);

    // Pass attributes directly down into GPU vertex operations
    gl.uniform1f(
      gl.getUniformLocation(particleProgram, "u_baseSize"),
      BASE_SIZE,
    );
    gl.uniform1f(
      gl.getUniformLocation(particleProgram, "u_massFactor"),
      FORCE_MASS,
    );

    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
