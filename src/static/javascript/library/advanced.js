// Dots Field
{
  const dotFields = document.querySelectorAll(".dots-field__svg");

  dotFields.forEach((comp) => {
    const sizeVal = parseFloat(comp.dataset.dotSize) || 3;
    const gapVal = parseFloat(comp.dataset.dotGap) || 24;
    const scatterVal = parseFloat(comp.dataset.dotScatter) || 0.5; // Try dropping lower e.g. 0.001
    const sensitivityVal = parseFloat(comp.dataset.dotSensitivity) || 0.9;

    const svg = { el: comp, width: 1, height: 1, x: 0, y: 0 };
    const dots = [];
    const circle = { radius: sizeVal, margin: gapVal };
    const mouse = { x: 0, y: 0, prevX: 0, prevY: 0, speed: 0 };

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

      const dotSize = circle.radius * 2 + circle.margin;

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

          dot.position = { x: dot.anchor.x, y: dot.anchor.y };
          dot.smooth = { x: dot.anchor.x, y: dot.anchor.y };
          dot.velocity = { x: 0, y: 0 };
          dot.move = { x: 0, y: 0 };

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

      let repositionDots = scatterVal;

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
        let magnetSensitivity = sensitivityVal;

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
  });
}

// See grid-flow-img.js for effect
