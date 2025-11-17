import { mqMouse, mqMotionAllow } from "../util.js";
const flowImgs = document.querySelectorAll(".grid-flow-parent");

if (mqMouse && mqMotionAllow) {
  const gridFlowEffect = (container) => {
    const img = container.querySelector(".grid-flow-img");

    // Configs from dataset
    let easeFactor = parseFloat(container.dataset.gridFlowEase) || 0.075;
    const gridSize = parseFloat(container.dataset.gridFlowGrid) || 20.0;
    const intensityBase = parseFloat(container.dataset.gridFlowIntensity) || 1.0;
    const range = parseFloat(container.dataset.gridFlowRange) || 0.3; // NEW: range of influence

    let scene, camera, renderer, planeMesh;
    let mousePosition = { x: 0.5, y: 0.5 };
    let targetMousePosition = { x: 0.5, y: 0.5 };
    let aberrationIntensity = 0.0;
    let prevPosition = { x: 0.5, y: 0.5 };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      uniform sampler2D u_texture;
      uniform vec2 u_mouse;
      uniform vec2 u_prevMouse;
      uniform float u_aberrationIntensity;
      uniform float u_grid;
      uniform vec2 u_scale;
      uniform float u_range;

      void main() {
        vec2 gridUV = floor(vUv * vec2(u_grid, u_grid)) / vec2(u_grid, u_grid);
        vec2 centerOfPixel = gridUV + vec2(1.0/u_grid, 1.0/u_grid);

        vec2 mouseDirection = u_mouse - u_prevMouse;
        vec2 pixelToMouseDirection = centerOfPixel - u_mouse;
        float pixelDistanceToMouse = length(pixelToMouseDirection);

        // use configurable range
        float strength = smoothstep(u_range, 0.0, pixelDistanceToMouse);

        vec2 uvOffset = strength * -mouseDirection * 0.2;
        vec2 uv = (vUv - 0.5) * u_scale + 0.5 - uvOffset;

        vec4 colorR = texture2D(u_texture, uv + vec2(strength * u_aberrationIntensity * 0.01, 0.0));
        vec4 colorG = texture2D(u_texture, uv);
        vec4 colorB = texture2D(u_texture, uv - vec2(strength * u_aberrationIntensity * 0.01, 0.0));

        gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
      }
    `;

    function initializeScene(texture) {
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(80, img.offsetWidth / img.offsetHeight, 0.01, 10);
      camera.position.z = 1;

      let shaderUniforms = {
        u_mouse: { value: new THREE.Vector2() },
        u_prevMouse: { value: new THREE.Vector2() },
        u_aberrationIntensity: { value: 0.0 },
        u_texture: { value: texture },
        u_grid: { value: gridSize },
        u_scale: { value: new THREE.Vector2(1.0, 1.0) },
        u_range: { value: range }, // NEW
      };

      const imgAspect = texture.image.width / texture.image.height;
      const planeAspect = img.offsetWidth / img.offsetHeight;
      const fitMode = container.dataset.gridFlowFit || "cover";

      if (fitMode === "cover") {
        if (imgAspect > planeAspect) {
          shaderUniforms.u_scale.value.set(planeAspect / imgAspect, 1.0);
        } else {
          shaderUniforms.u_scale.value.set(1.0, imgAspect / planeAspect);
        }
      } else if (fitMode === "contain") {
        if (imgAspect > planeAspect) {
          shaderUniforms.u_scale.value.set(1.0, imgAspect / planeAspect);
        } else {
          shaderUniforms.u_scale.value.set(planeAspect / imgAspect, 1.0);
        }
      } else {
        // stretch (default) → no scaling
        shaderUniforms.u_scale.value.set(1.0, 1.0);
      }

      const aspect = img.offsetWidth / img.offsetHeight;
      planeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(aspect * 2, 2),
        new THREE.ShaderMaterial({
          uniforms: shaderUniforms,
          vertexShader,
          fragmentShader,
        })
      );

      scene.add(planeMesh);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(img.offsetWidth, img.offsetHeight);

      container.appendChild(renderer.domElement);
    }

    // Load texture, set filters, then init
    new THREE.TextureLoader().load(img.src, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      initializeScene(tex);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      animateScene();
    });

    function animateScene() {
      requestAnimationFrame(animateScene);

      mousePosition.x += (targetMousePosition.x - mousePosition.x) * easeFactor;
      mousePosition.y += (targetMousePosition.y - mousePosition.y) * easeFactor;

      planeMesh.material.uniforms.u_mouse.value.set(mousePosition.x, 1.0 - mousePosition.y);

      planeMesh.material.uniforms.u_prevMouse.value.set(prevPosition.x, 1.0 - prevPosition.y);

      aberrationIntensity = Math.max(0.0, aberrationIntensity - 0.05);
      planeMesh.material.uniforms.u_aberrationIntensity.value = aberrationIntensity;

      renderer.render(scene, camera);
    }

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    function handleMouseMove(event) {
      let rect = container.getBoundingClientRect();
      prevPosition = { ...targetMousePosition };

      targetMousePosition.x = (event.clientX - rect.left) / rect.width;
      targetMousePosition.y = (event.clientY - rect.top) / rect.height;

      aberrationIntensity = intensityBase;
    }

    function handleMouseEnter(event) {
      let rect = container.getBoundingClientRect();
      mousePosition.x = targetMousePosition.x = (event.clientX - rect.left) / rect.width;
      mousePosition.y = targetMousePosition.y = (event.clientY - rect.top) / rect.height;
    }

    function handleMouseLeave() {
      targetMousePosition = { ...prevPosition };
    }
  };

  flowImgs.forEach(gridFlowEffect);
}
