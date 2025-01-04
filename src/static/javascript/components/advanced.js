if (document.querySelector(".main-advanced")) {
  // Grid-flow img mouse effect // Uses three.js, see index.html for script
  {
    // variables
    const imageContainer = document.querySelector(".grid-flow-parent");
    const imageElement = document.querySelector(".grid-flow-img");

    let easeFactor = 0.05; // default 0.02, individual eases below.
    let scene, camera, renderer, planeMesh;
    let mousePosition = { x: 0.5, y: 0.5 };
    let targetMousePosition = { x: 0.5, y: 0.5 };
    let mouseStopTimeout;
    let aberrationIntensity = 0.0;
    let lastPosition = { x: 0.5, y: 0.5 };
    let prevPosition = { x: 0.5, y: 0.5 };

    // shaders
    const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

    let cubeSize = 20.0; // default 20.0 // Higher means more/smaller cubes
    const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D u_texture;    
    uniform vec2 u_mouse;
    uniform vec2 u_prevMouse;
    uniform float u_aberrationIntensity;

    void main() {
        vec2 gridUV = floor(vUv * vec2(${cubeSize}, ${cubeSize})) / vec2(${cubeSize}, ${cubeSize});
        vec2 centerOfPixel = gridUV + vec2(1.0/40.0, 1.0/40.0); // Don't worry about updating here
        
        vec2 mouseDirection = u_mouse - u_prevMouse;
        
        vec2 pixelToMouseDirection = centerOfPixel - u_mouse;
        float pixelDistanceToMouse = length(pixelToMouseDirection);
        float strength = smoothstep(0.3, 0.0, pixelDistanceToMouse);
 
        vec2 uvOffset = strength * - mouseDirection * 0.2;
        vec2 uv = vUv - uvOffset;

        vec4 colorR = texture2D(u_texture, uv + vec2(strength * u_aberrationIntensity * 0.01, 0.0));
        vec4 colorG = texture2D(u_texture, uv);
        vec4 colorB = texture2D(u_texture, uv - vec2(strength * u_aberrationIntensity * 0.01, 0.0));

        gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
    }
`;

    function initializeScene(texture) {
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(
        90, // default 80
        imageElement.offsetWidth / imageElement.offsetHeight, // width ÷ height per docs
        0.01, // default 0.01
        10
      );
      camera.position.z = 1;

      let shaderUniforms = {
        u_mouse: { type: "v2", value: new THREE.Vector2() },
        u_prevMouse: { type: "v2", value: new THREE.Vector2() },
        u_aberrationIntensity: { type: "f", value: 0.0 },
        u_texture: { type: "t", value: texture },
      };

      planeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: shaderUniforms,
          vertexShader,
          fragmentShader,
        })
      );

      scene.add(planeMesh);

      renderer = new THREE.WebGLRenderer();
      renderer.setSize(imageElement.offsetWidth, imageElement.offsetHeight);

      imageContainer.appendChild(renderer.domElement);
    }

    initializeScene(new THREE.TextureLoader().load(imageElement.src));

    animateScene();

    function animateScene() {
      requestAnimationFrame(animateScene);

      mousePosition.x += (targetMousePosition.x - mousePosition.x) * easeFactor;
      mousePosition.y += (targetMousePosition.y - mousePosition.y) * easeFactor;

      planeMesh.material.uniforms.u_mouse.value.set(
        mousePosition.x,
        1.0 - mousePosition.y
      );

      planeMesh.material.uniforms.u_prevMouse.value.set(
        prevPosition.x,
        1.0 - prevPosition.y
      );

      aberrationIntensity = Math.max(0.0, aberrationIntensity - 0.05);

      planeMesh.material.uniforms.u_aberrationIntensity.value =
        aberrationIntensity;

      renderer.render(scene, camera);
    }

    imageContainer.addEventListener("mousemove", handleMouseMove);
    imageContainer.addEventListener("mouseenter", handleMouseEnter);
    imageContainer.addEventListener("mouseleave", handleMouseLeave);

    function handleMouseMove(event) {
      let rect = imageContainer.getBoundingClientRect();
      prevPosition = { ...targetMousePosition };

      targetMousePosition.x = (event.clientX - rect.left) / rect.width;
      targetMousePosition.y = (event.clientY - rect.top) / rect.height;

      aberrationIntensity = 1;
    }

    function handleMouseEnter(event) {
      let rect = imageContainer.getBoundingClientRect();

      mousePosition.x = targetMousePosition.x =
        (event.clientX - rect.left) / rect.width;
      mousePosition.y = targetMousePosition.y =
        (event.clientY - rect.top) / rect.height;
    }

    function handleMouseLeave() {
      targetMousePosition = { ...prevPosition };
    }
  }

  // Dots Field
  {
    const svg = {
      el: document.querySelector("svg"),
      width: 1,
      height: 1,
      x: 0,
      y: 0,
    };

    const dots = [];

    const circle = {
      radius: 3, // Dot size // default 3
      margin: 20, // Dot gap // default 20
    };

    const mouse = {
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      speed: 0,
    };

    // Resize
    function resizeHandler() {
      const bounding = svg.el.getBoundingClientRect();

      svg.width = bounding.width;
      svg.height = bounding.height;

      // Include scroll offsets to account for the current scroll position
      svg.x = bounding.left + window.scrollX;
      svg.y = bounding.top + window.scrollY;
    }

    // Create dots
    function createDots() {
      resizeHandler();

      let dotCount = 1; // default 1 (didn't exist before)
      const dotSize = circle.radius + circle.margin / dotCount;

      const rows = Math.floor(svg.height / dotSize);
      const cols = Math.floor(svg.width / dotSize);

      const x = (svg.width % dotSize) / 2;
      const y = (svg.height % dotSize) / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const dot = {
            anchor: {
              x: x + col * dotSize + dotSize / 2,
              y: y + row * dotSize + dotSize / 2,
            },
          };

          dot.position = {
            x: dot.anchor.x,
            y: dot.anchor.y,
          };

          dot.smooth = {
            x: dot.anchor.x,
            y: dot.anchor.y,
          };

          dot.velocity = {
            x: 0,
            y: 0,
          };

          dot.move = {
            x: 0,
            y: 0,
          };

          dot.el = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );
          dot.el.setAttribute("cx", dot.anchor.x);
          dot.el.setAttribute("cy", dot.anchor.y);
          dot.el.setAttribute("r", circle.radius / 2);

          svg.el.append(dot.el);
          dots.push(dot);
        }
      }
    }

    /* Check mouse move */
    function mouseHandler(e) {
      mouse.x = e.pageX;
      mouse.y = e.pageY;
    }

    // Check mouse speed
    function mouseSpeed() {
      const distX = mouse.prevX - mouse.x;
      const distY = mouse.prevY - mouse.y;
      const dist = Math.hypot(distX, distY);

      let repositionDots = 0.5; // default 0.5 // 0.001 + magnetSensitivity 0.99 looks cool

      mouse.speed += (dist - mouse.speed) * repositionDots;
      if (mouse.speed < 0.001) {
        mouse.speed = 0;
      }

      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      setTimeout(mouseSpeed, 20);
    }

    // Tick
    function tick() {
      dots.forEach((dot) => {
        const distX = mouse.x - svg.x - dot.position.x;
        const distY = mouse.y - svg.y - dot.position.y;
        const dist = Math.max(Math.hypot(distX, distY), 1);
        let magnetSensitivity = 0.9; // default 0.9 // 1 looks like spilled salt

        const angle = Math.atan2(distY, distX);

        const move = (500 / dist) * (mouse.speed * 0.1);

        if (dist < 100) {
          dot.velocity.x += Math.cos(angle) * -move;
          dot.velocity.y += Math.sin(angle) * -move;
        }

        dot.velocity.x *= magnetSensitivity;
        dot.velocity.y *= magnetSensitivity;

        dot.position.x = dot.anchor.x + dot.velocity.x;
        dot.position.y = dot.anchor.y + dot.velocity.y;

        dot.smooth.x += (dot.position.x - dot.smooth.x) * 0.1;
        dot.smooth.y += (dot.position.y - dot.smooth.y) * 0.1;

        dot.el.setAttribute("cx", dot.smooth.x);
        dot.el.setAttribute("cy", dot.smooth.y);
      });

      requestAnimationFrame(tick);
    }

    // Ready
    (function () {
      // Resize
      window.addEventListener("resize", resizeHandler);

      // Mouse
      window.addEventListener("mousemove", mouseHandler);
      mouseSpeed();

      // Dots
      createDots();

      // Tick
      tick();
    })();
  }

  // Light — Original https://codepen.io/wodniack/pen/qBrgMpm
  // ❗️ Very choppy on Safari. Also... turns on Mac M2 fan. Haven't heard my fan since upgrading laptops.
  {
    const mouse = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
    const cursorPoint = document.querySelector(".cursor__point");
    const cursorLight = document.querySelector(".cursor__light");
    const light = document.querySelector("#point-light");
    const turbulence = document.querySelector("#turbulence");
    let noise = 0;

    const updateMousePosition = (e) => {
      mouse.x = e.clientX + window.scrollX / window.innerWidth;
      mouse.y = e.clientY + window.scrollY / window.innerHeight;
    };

    // Smoothly animate cursor and light
    const animateCursor = () => {
      light.setAttribute("x", mouse.smoothX);
      light.setAttribute("y", mouse.smoothY);

      // Update turbulence noise. 0 to hold still. Default 0.5
      noise += 0;
      turbulence.setAttribute("seed", Math.round(noise));

      // Update cursor positions
      cursorPoint.style.translate = `${mouse.x}px ${mouse.y}px`;
      cursorLight.style.translate = `${mouse.smoothX}px ${mouse.smoothY}px`;

      // Smooth transition
      mouse.smoothX += (mouse.x - mouse.smoothX) * 0.1;
      mouse.smoothY += (mouse.y - mouse.smoothY) * 0.1;

      requestAnimationFrame(animateCursor);
    };

    // Initialize event listeners and animation
    const initCursor = () => {
      window.addEventListener("mousemove", updateMousePosition);
      animateCursor();
    };

    initCursor();
  }
}
