import { mqMotionAllow } from "../util.js";
import { afterPinnedSections } from "../utils/pin-order.js";

// Groups by grid-column-start (not left offset) to avoid sub-pixel splits.
if (mqMotionAllow) {
  let responsiveGsap = gsap.matchMedia();

  responsiveGsap.add(
    {
      maxMd: "(max-width: 768px)",
      maxLg: "(max-width: 1024px)",
      minLg: "(min-width: 1025px)",
    },
    (context) => {
      const cleanups = [];

      afterPinnedSections(() => {
        document.querySelectorAll(".image-columns").forEach((grid) => {
          // Hidden slots (display:none) aren't part of any column here.
          const items = Array.from(
            grid.querySelectorAll(".image-columns__item"),
          ).filter((item) => getComputedStyle(item).display !== "none");
          if (items.length < 2) return;

          const byCol = new Map();
          items.forEach((item) => {
            const col = getComputedStyle(item).gridColumnStart;
            if (!byCol.has(col)) byCol.set(col, []);
            byCol.get(col).push(item);
          });

          const columns = [...byCol.entries()]
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([, els]) => els);
          if (columns.length < 2) return;

          const columnHeight = (els) => {
            const tops = els.map((el) => el.getBoundingClientRect().top);
            const bottoms = els.map((el) => el.getBoundingClientRect().bottom);
            return Math.max(...bottoms) - Math.min(...tops);
          };

          const deltaFor = (i) => {
            const heights = columns.map(columnHeight);
            return heights[i] - Math.min(...heights);
          };

          const shortestRect = () => {
            const heights = columns.map(columnHeight);
            const els = columns[heights.indexOf(Math.min(...heights))];
            return {
              top:
                Math.min(...els.map((el) => el.getBoundingClientRect().top)) +
                window.scrollY,
              bottom:
                Math.max(
                  ...els.map((el) => el.getBoundingClientRect().bottom),
                ) + window.scrollY,
            };
          };

          // Pin the grid's height to the shortest column so overflow can crop there.
          const syncSpace = () => {
            grid.style.height = `${Math.min(...columns.map(columnHeight))}px`;
          };
          syncSpace();
          ScrollTrigger.addEventListener("refreshInit", syncSpace);
          cleanups.push(() => {
            ScrollTrigger.removeEventListener("refreshInit", syncSpace);
            grid.style.height = "";
          });

          const startPoint = grid.dataset.imageColumnsStart || "top 95%";
          // px or % (of the shortest column's height) start y for moving columns.
          const startOffset = (
            grid.dataset.imageColumnsStartOffset || ""
          ).trim();
          const startOffsetPx = () => {
            const n = parseFloat(startOffset);
            if (!n) return 0;
            return startOffset.endsWith("%")
              ? (n / 100) * Math.min(...columns.map(columnHeight))
              : n;
          };
          const showMarkers = grid.dataset.imageColumnsMarkers === "true";
          const heights = columns.map(columnHeight);
          const shortestTrigger =
            columns[heights.indexOf(Math.min(...heights))][0];

          // Ends when the shortest column's bottom reaches 75% of the viewport.
          const endVh = 0.75;

          columns.forEach((els, i) => {
            if (deltaFor(i) <= 0) return;

            gsap.fromTo(
              els,
              { y: () => startOffsetPx() },
              {
                y: () => -deltaFor(i),
                ease: "none",
                scrollTrigger: {
                  trigger: shortestTrigger,
                  start: startPoint,
                  end: () =>
                    shortestRect().bottom - (window.innerHeight / 1) * endVh,
                  scrub: 0.8,
                  invalidateOnRefresh: true,
                  markers: showMarkers,
                },
              },
            );
          });
        });
      }, context);

      return () => cleanups.forEach((fn) => fn());
    },
  );
}
