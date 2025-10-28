if (document.getElementById("bg-particle-waves")) {
  //
  // Vertex Shader
  //
  const particleVertex = `
    attribute float scale;
    uniform float uTime;

    void main() {
      vec3 p = position;
      float s = scale;

      // Wave motion
      p.y += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
      p.x += (sin(p.y + uTime) * 0.5);
      s += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = s * 15.0 * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  //
  // Fragment Shader
  //
  const particleFragment = `
    uniform vec3 uColor;
    uniform float uOpacity;

    void main() {
      gl_FragColor = vec4(uColor, uOpacity);
    }
  `;

  //
  // Default Configuration
  //
  const particleWavesDefaults = {
    gap: 0.3, // distance between particles
    amountX: 200, // grid density (x)
    amountY: 200, // grid density (y)
    speed: 0.05, // animation speed
    color: "#ffffff", // particle color
    opacity: 0.5, // transparency
    size: 15.0, // base size of each point
    cameraPos: { x: 0, y: 6, z: 5 },
    antialias: true,
    pixelRatio: window.devicePixelRatio,
  };

  //
  // Utility: Linear Interpolation (optional use)
  //
  function lerp(start, end, amount) {
    return (1 - amount) * start + amount * end;
  }

  //
  // Main Class
  //
  class ParticleWaves {
    constructor(config = {}) {
      this.config = {
        canvas: document.getElementById("bg-particle-waves"),
        winWidth: window.innerWidth,
        winHeight: window.innerHeight,
        aspectRatio: window.innerWidth / window.innerHeight,
        mouse: new THREE.Vector2(-10, -10),
        ...particleWavesDefaults,
        ...config, // merge user overrides
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

    //
    // Scene Setup
    //
    initCamera() {
      const { aspectRatio, cameraPos } = this.config;
      this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.01, 1000);
      this.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    }

    initScene() {
      this.scene = new THREE.Scene();
    }

    initRenderer() {
      const { canvas, antialias, pixelRatio, winWidth, winHeight } = this.config;
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias,
        alpha: true,
      });
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(winWidth, winHeight);
    }

    //
    // Particle Grid Setup
    //
    initParticles() {
      const { gap, amountX, amountY, color, opacity } = this.config;
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

    //
    // Animation Loop
    //
    animate() {
      this.particleMaterial.uniforms.uTime.value += this.config.speed;
      requestAnimationFrame(this.animate);
      this.render();
    }

    render() {
      this.camera.lookAt(this.scene.position);
      this.renderer.render(this.scene, this.camera);
    }

    //
    // Events
    //
    bindEvents() {
      window.addEventListener("resize", this.onResize);
      window.addEventListener("mousemove", this.onMouseMove, false);
    }

    onMouseMove(e) {
      this.config.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.config.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    onResize() {
      this.config.winWidth = window.innerWidth;
      this.config.winHeight = window.innerHeight;
      this.camera.aspect = this.config.winWidth / this.config.winHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.config.winWidth, this.config.winHeight);
    }
  }

  //
  // Init Function (reads from data attributes)
  //
  const el = document.getElementById("bg-particle-waves");

  const userConfig = {
    gap: parseFloat(el.dataset.gap) || particleWavesDefaults.gap,
    amountX: parseInt(el.dataset.amountX) || particleWavesDefaults.amountX,
    amountY: parseInt(el.dataset.amountY) || particleWavesDefaults.amountY,
    color: el.dataset.color || particleWavesDefaults.color,
    opacity: parseFloat(el.dataset.opacity) || particleWavesDefaults.opacity,
    speed: parseFloat(el.dataset.speed) || particleWavesDefaults.speed,
  };

  new ParticleWaves(userConfig);
}
