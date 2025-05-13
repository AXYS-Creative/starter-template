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

  // Ensure the correct radio button is checked on load
  document.querySelector(`#theme-${saved}`)?.setAttribute("checked", "");

  radios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) {
        setTheme(e.target.value);
      }
    });
  });

  // Optional: listen for system changes if system is selected
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (localStorage.getItem(storageKey) === "system") {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
})();
