import { mqMouse, mqMotionAllow } from "../util.js";

if (mqMouse && mqMotionAllow) {
  function makeCubicBezierEasing(input) {
    if (!input) return null;

    const str = String(input).trim();
    let nums = null;

    const match = str.match(/cubic-bezier\(([^)]+)\)/i);
    if (match) {
      nums = match[1].split(",").map((n) => Number.parseFloat(n.trim()));
    } else {
      nums = str.split(",").map((n) => Number.parseFloat(n.trim()));
    }

    if (!nums || nums.length !== 4 || nums.some((n) => Number.isNaN(n))) return null;

    const [p1x, p1y, p2x, p2y] = nums;

    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;

    const sampleCurveX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleCurveY = (t) => ((ay * t + by) * t + cy) * t;
    const sampleCurveDerivativeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

    function solveCurveTForX(x) {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const x2 = sampleCurveX(t) - x;
        const d2 = sampleCurveDerivativeX(t);
        if (Math.abs(x2) < 1e-6) return t;
        if (Math.abs(d2) < 1e-6) break;
        t -= x2 / d2;
      }

      let t0 = 0;
      let t1 = 1;
      t = x;

      while (t0 < t1) {
        const x2 = sampleCurveX(t);
        if (Math.abs(x2 - x) < 1e-6) return t;
        if (x > x2) t0 = t;
        else t1 = t;
        t = (t1 + t0) / 2;
      }

      return t;
    }

    return function ease(t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const solvedT = solveCurveTForX(t);
      return sampleCurveY(solvedT);
    };
  }

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  const NAMED_EASINGS = {
    linear: (t) => t,
    ease: makeCubicBezierEasing("cubic-bezier(0.25, 0.1, 0.25, 1)"),
    "ease-out": makeCubicBezierEasing("cubic-bezier(0, 0, 0.58, 1)"),
    "ease-in-out": makeCubicBezierEasing("cubic-bezier(0.42, 0, 0.58, 1)"),

    "ease-out-soft": makeCubicBezierEasing("cubic-bezier(0.16, 1, 0.3, 1)"),
  };

  document.querySelectorAll(".magnet").forEach((el) => {
    let mouseX = 0;
    let mouseY = 0;
    let elX = 0;
    let elY = 0;

    let followFrame = null;
    let returnFrame = null;

    const dataX = el.getAttribute("data-magnet-x");
    const dataY = el.getAttribute("data-magnet-y");

    const xStrength = dataX !== null ? Number.parseFloat(dataX) : 0.5;
    const yStrength = dataY !== null ? Number.parseFloat(dataY) : 0.5;

    const followEase = (() => {
      const v = el.getAttribute("data-magnet-follow-ease");
      if (v === null) return 1;
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
    })();

    const returnDuration = (() => {
      const v = el.getAttribute("data-magnet-return-duration");
      if (v === null) return 220;
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? Math.max(0, n) : 220;
    })();

    const returnEase = (() => {
      const raw = el.getAttribute("data-magnet-return-ease");
      if (!raw) return NAMED_EASINGS["ease-out-soft"];

      const key = String(raw).trim().toLowerCase();
      if (NAMED_EASINGS[key]) return NAMED_EASINGS[key];

      const bez = makeCubicBezierEasing(raw);
      return bez || NAMED_EASINGS["ease-out-soft"];
    })();

    const setTransform = () => {
      el.style.transform = `translate(${elX}px, ${elY}px)`;
    };

    const onPointerMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      mouseX = (e.clientX - centerX) * xStrength;
      mouseY = (e.clientY - centerY) * yStrength;
    };

    const animateFollow = () => {
      elX += (mouseX - elX) * followEase;
      elY += (mouseY - elY) * followEase;

      setTransform();
      followFrame = requestAnimationFrame(animateFollow);
    };

    const stopFollow = () => {
      if (followFrame !== null) {
        cancelAnimationFrame(followFrame);
        followFrame = null;
      }
    };

    const stopReturn = () => {
      if (returnFrame !== null) {
        cancelAnimationFrame(returnFrame);
        returnFrame = null;
      }
    };

    const animateReturnToOrigin = () => {
      stopReturn();

      if (returnDuration === 0) {
        elX = 0;
        elY = 0;
        setTransform();
        return;
      }

      const startX = elX;
      const startY = elY;
      const startTime = performance.now();

      const tick = (now) => {
        const t = clamp01((now - startTime) / returnDuration);
        const eased = returnEase ? returnEase(t) : t;

        elX = startX + (0 - startX) * eased;
        elY = startY + (0 - startY) * eased;
        setTransform();

        if (t < 1) {
          returnFrame = requestAnimationFrame(tick);
        } else {
          returnFrame = null;
          elX = 0;
          elY = 0;
          setTransform();
        }
      };

      returnFrame = requestAnimationFrame(tick);
    };

    const onPointerEnter = () => {
      stopReturn();

      el.addEventListener("pointermove", onPointerMove, { passive: true });

      if (followFrame === null) {
        animateFollow();
      }
    };

    const onPointerLeave = () => {
      el.removeEventListener("pointermove", onPointerMove);

      stopFollow();

      mouseX = 0;
      mouseY = 0;
      animateReturnToOrigin();
    };

    el.addEventListener("pointerenter", onPointerEnter);
    el.addEventListener("pointerleave", onPointerLeave);
  });
}
