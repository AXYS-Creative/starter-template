import { mqMouse, mqMotionAllow } from "../utility.js";

if (mqMouse.matches && mqMotionAllow.matches) {
  const magnetEffect = () => {
    document.querySelectorAll(".magnet").forEach((el) =>
      el.addEventListener("mousemove", function (e) {
        const pos = this.getBoundingClientRect();
        const mx = e.clientX - pos.left - pos.width / 2;
        const my = e.clientY - pos.top - pos.height / 2;

        this.style.translate = `${mx * 0.48}px ${my * 0.48}px`;

        if (this.classList.contains("magnet-weak")) {
          this.style.translate = `${mx * 0.12}px ${my * 0.12}px`;
        }

        if (this.classList.contains("magnet-strong")) {
          this.style.translate = `${mx * 0.96}px ${my * 0.96}px`;
        }

        if (this.classList.contains("magnet-wide-btn")) {
          this.style.translate = `${mx * 0.48}px ${my * 0.96}px`;
        }
      })
    );

    document.querySelectorAll(".magnet").forEach((el) =>
      el.addEventListener("mouseleave", function () {
        this.style.translate = "0 0";
      })
    );
  };

  magnetEffect();
}
