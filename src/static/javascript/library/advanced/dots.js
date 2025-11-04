const dotFields = document.querySelectorAll(".dots-flow");

dotFields.forEach((comp) => {
  // Defaults set in component (dots.njk)
  const config = {
    radius: parseFloat(comp.dataset.dotSize),
    gap: Math.max(parseFloat(comp.dataset.dotGap) || 24, 8), // Prevents gap below 8
    restore: parseFloat(comp.dataset.dotRestore), // Smaller value eg 0.0001 means the dots take longer to restore position (with higher sensitivity eg 0.99)
    sensitivity: parseFloat(comp.dataset.dotSensitivity), // [0.9 - 0.99] recommended. 1 prevents restore
    distance: parseFloat(comp.dataset.dotDistance), // size of mouse radius (how many dots are affected)
    strength: parseFloat(comp.dataset.dotStrength),
    color: comp.dataset.dotColor,
    illuminate: comp.dataset.dotIlluminate === "true", // Adjust opacity of dots within range
    grow: comp.dataset.dotGrow === "true", // Adjust scale of dots within range
  };

  const svg = { el: comp, width: 1, height: 1, x: 0, y: 0 };
  const dots = [];
  const mouse = { x: 0, y: 0, prevX: 0, prevY: 0, speed: 0 };

  // Resize
  function resizeHandler() {
    const bounding = svg.el.getBoundingClientRect();
    svg.width = bounding.width;
    svg.height = bounding.height;
    svg.x = bounding.left + window.scrollX;
    svg.y = bounding.top + window.scrollY;
  }

  // Create dots
  function createDots() {
    svg.el.innerHTML = ""; // clear previous
    dots.length = 0; // reset array
    resizeHandler();

    const dotSize = config.radius * 2 + config.gap;
    const rows = Math.floor(svg.height / dotSize);
    const cols = Math.floor(svg.width / dotSize);
    const x = (svg.width % dotSize) / 2;
    const y = (svg.height % dotSize) / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const anchorX = x + col * dotSize + dotSize / 2;
        const anchorY = y + row * dotSize + dotSize / 2;

        const dot = {
          anchor: { x: anchorX, y: anchorY },
          position: { x: anchorX, y: anchorY },
          smooth: { x: anchorX, y: anchorY },
          velocity: { x: 0, y: 0 },
        };

        dot.el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.el.setAttribute("cx", anchorX);
        dot.el.setAttribute("cy", anchorY);
        dot.el.setAttribute("r", config.radius); // use radius directly
        svg.el.append(dot.el);

        dots.push(dot);
      }
    }
  }

  // Mouse
  function mouseHandler(e) {
    mouse.x = e.pageX;
    mouse.y = e.pageY;
  }

  // Mouse speed
  function mouseSpeed() {
    const distX = mouse.prevX - mouse.x;
    const distY = mouse.prevY - mouse.y;
    const dist = Math.hypot(distX, distY);

    mouse.speed += (dist - mouse.speed) * config.restore;
    if (mouse.speed < 0.001) mouse.speed = 0;

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

      // --- Shared intensity calculation ---
      const minIntensity = 0.25; // floor for dim/grow effects
      let intensity = 1 - dist / config.distance;
      intensity = Math.min(Math.max(intensity, 0), 1); // clamp 0–1
      intensity = minIntensity + intensity * (1 - minIntensity); // scale

      // --- Dot color ---
      if (config.color) {
        dot.el.style.fill = config.color;
      }

      // --- Illuminate effect ---
      if (config.illuminate) {
        dot.el.style.opacity = intensity;
        // OR use color: dot.el.style.fill = `rgba(255,255,255,${intensity})`;
      }

      // --- Grow effect ---
      if (config.grow) {
        dot.el.setAttribute("r", config.radius * (1 + intensity));
      }

      // --- Motion ---
      const angle = Math.atan2(distY, distX);
      const move = Math.min((config.strength / dist) * (mouse.speed * 0.1), 20);

      if (dist < config.distance) {
        dot.velocity.x += Math.cos(angle) * -move;
        dot.velocity.y += Math.sin(angle) * -move;
      }

      dot.velocity.x *= config.sensitivity;
      dot.velocity.y *= config.sensitivity;

      dot.position.x = dot.anchor.x + dot.velocity.x;
      dot.position.y = dot.anchor.y + dot.velocity.y;

      dot.smooth.x += (dot.position.x - dot.smooth.x) * 0.1;
      dot.smooth.y += (dot.position.y - dot.smooth.y) * 0.1;

      dot.el.setAttribute("cx", dot.smooth.x);
      dot.el.setAttribute("cy", dot.smooth.y);
    });

    requestAnimationFrame(tick);
  }

  // Init
  (function () {
    window.addEventListener("resize", resizeHandler);
    window.addEventListener("mousemove", mouseHandler);
    mouseSpeed();
    createDots();
    tick();
  })();
});
