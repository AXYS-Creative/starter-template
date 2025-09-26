const storageKey = "theme-preference";
const radios = document.querySelectorAll('input[name="theme"]');

const getSystemPreference = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyTheme = (theme) => {
  if (theme === "system") {
    theme = getSystemPreference();
  }
  document.documentElement.setAttribute("data-theme", theme);
};

const setTheme = (theme) => {
  localStorage.setItem(storageKey, theme);
  applyTheme(theme);
};

const saved = localStorage.getItem(storageKey) || "system";
applyTheme(saved);

document.querySelector(`#theme-${saved}`)?.setAttribute("checked", "");

radios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.checked) {
      setTheme(e.target.value);
    }
  });
});

// Listen for system changes if system is selected
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (localStorage.getItem(storageKey) === "system") {
      applyTheme(e.matches ? "dark" : "light");
    }
  });

// Dyanic image source based on theme
// Requires '.theme-img' util class and the 'data-light' & 'data-dark' attributes
const swapThemeImages = () => {
  const theme = document.documentElement.getAttribute("data-theme");
  const images = document.querySelectorAll("img.theme-img");

  images.forEach((img) => {
    const newSrc = img.dataset[theme];
    if (newSrc && img.src !== newSrc) {
      img.src = newSrc;
    }
  });
};

swapThemeImages();

const observer = new MutationObserver(swapThemeImages);
observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});

// Multi Toggle Variant
const themeToggleMulti = document.querySelector(".theme-toggle--multi");
if (themeToggleMulti) {
  const options = themeToggleMulti.querySelectorAll(".theme-toggle__option");
  const slider = themeToggleMulti.querySelector('[class*="slider"]');

  let activeOption = themeToggleMulti
    .querySelector("input:checked")
    ?.closest(".theme-toggle__option");

  const moveSlider = (target) => {
    if (!target) return;
    const { offsetLeft, offsetWidth } = target;
    slider.style.left = `${offsetLeft}px`;
    slider.style.width = `${offsetWidth}px`;
  };

  // Initialize slider at active
  moveSlider(activeOption);

  // Use event delegation for hover
  themeToggleMulti.addEventListener("mouseover", (e) => {
    const option = e.target.closest(".theme-toggle__option");
    if (option && themeToggleMulti.contains(option)) {
      moveSlider(option);
    }
  });

  themeToggleMulti.addEventListener("mouseleave", () => {
    moveSlider(activeOption); // snap back when leaving the whole group
  });

  // Update active option on change
  options.forEach((option) => {
    const input = option.querySelector("input[type=radio]");
    if (input) {
      input.addEventListener("change", () => {
        if (input.checked) {
          activeOption = option;
          moveSlider(activeOption);
        }
      });
    }
  });
}
