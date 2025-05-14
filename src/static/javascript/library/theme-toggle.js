(() => {
  const storageKey = "theme-preference";
  const radios = document.querySelectorAll('input[name="theme"]');

  const getSystemPreference = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

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

  // Handle image swap. Requires 'theme-img' utility class and the 'data-light' & 'data-dark' attributes
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
})();
