const particleWaveElements = document.getElementById("particle-waves");

if (particleWaveElements) {
  const particleVertex = `
    attribute float scale;
    uniform float uTime;
    void main() {
      vec3 p = position;
      float s = scale;
      p.y += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
      p.x += (sin(p.y + uTime) * 0.5);
      s += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = s * 15.0 * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const particleFragment = `
    uniform vec3 uColor;
    uniform float uOpacity;
    void main() {
      gl_FragColor = vec4(uColor, uOpacity);
    }
  `;

  // Convert CSS-style dimension into px number
  function resolveSize(value, relativeTo = window.innerWidth, axis = "x") {
    if (value.endsWith("px")) return parseFloat(value);
    if (value.endsWith("%")) {
      const percent = parseFloat(value) / 100;
      return percent * (axis === "x" ? window.innerWidth : window.innerHeight);
    }
    if (value.endsWith("vw")) return (parseFloat(value) / 100) * window.innerWidth;
    if (value.endsWith("vh")) return (parseFloat(value) / 100) * window.innerHeight;
    return parseFloat(value); // fallback (plain number)
  }

  class ParticleWaves {
    constructor(config = {}) {
      this.config = {
        canvas: particleWaveElements,
        winWidth: window.innerWidth,
        winHeight: window.innerHeight,
        aspectRatio: window.innerWidth / window.innerHeight,
        mouse: new THREE.Vector2(-10, -10),
        ...config,
      };

      this.onResize = this.onResize.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.animate = this.animate.bind(this);

      this.initCamera();
      this.initScene();
      this.initRenderer();
      this.initParticles();
      this.bindEvents();
      this.animate();
    }

    initCamera() {
      this.camera = new THREE.PerspectiveCamera(75, this.config.aspectRatio, 0.01, 1000);
      this.camera.position.set(0, 6, 5);
    }

    initScene() {
      this.scene = new THREE.Scene();
    }

    initRenderer() {
      const { canvas, winWidth, winHeight } = this.config;
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(winWidth, winHeight);
    }

    initParticles() {
      const { gap, color, opacity, widthPx, heightPx } = this.config;

      // compute how many particles fit in the given dimensions
      const amountX = Math.floor(widthPx / gap);
      const amountY = Math.floor(heightPx / gap);
      const particleNum = amountX * amountY;

      const positions = new Float32Array(particleNum * 3);
      const scales = new Float32Array(particleNum);

      let i = 0,
        j = 0;
      for (let ix = 0; ix < amountX; ix++) {
        for (let iy = 0; iy < amountY; iy++) {
          positions[i] = ix * gap - (amountX * gap) / 2;
          positions[i + 1] = 0;
          positions[i + 2] = iy * gap - (amountY * gap) / 2;
          scales[j] = 1;
          i += 3;
          j++;
        }
      }

      this.particleGeometry = new THREE.BufferGeometry();
      this.particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      this.particleGeometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

      this.particleMaterial = new THREE.ShaderMaterial({
        transparent: true,
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
        },
      });

      this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
      this.scene.add(this.particles);
    }

    animate() {
      this.particleMaterial.uniforms.uTime.value += this.config.speed;
      requestAnimationFrame(this.animate);
      this.render();
    }

    render() {
      this.camera.lookAt(this.scene.position);
      this.renderer.render(this.scene, this.camera);
    }

    bindEvents() {
      window.addEventListener("resize", this.onResize);
      window.addEventListener("mousemove", this.onMouseMove, false);
    }

    onMouseMove(e) {
      this.config.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.config.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    }

    onResize() {
      this.config.winWidth = window.innerWidth;
      this.config.winHeight = window.innerHeight;
      this.camera.aspect = this.config.winWidth / this.config.winHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.config.winWidth, this.config.winHeight);
    }
  }

  // Utility: resolve CSS variable or color string
  function resolveCSSColor(value) {
    if (!value) return "#ffffff";
    if (value.startsWith("var(")) {
      const varName = value.match(/var\(([^)]+)\)/)[1].trim();
      const computed = getComputedStyle(document.documentElement).getPropertyValue(varName);
      if (computed) return computed.trim();
    }
    return value;
  }

  // Build config from dataset
  const el = particleWaveElements;
  const widthPx = resolveSize(el.dataset.width, window.innerWidth, "x");
  const heightPx = resolveSize(el.dataset.height, window.innerHeight, "y");

  const userConfig = {
    gap: parseFloat(el.dataset.gap),
    widthPx,
    heightPx,
    color: resolveCSSColor(el.dataset.color),
    opacity: parseFloat(el.dataset.opacity),
    speed: parseFloat(el.dataset.speed),
  };

  new ParticleWaves(userConfig);
}
