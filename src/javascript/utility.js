// Clear focus from any element (except inputs) on mousemove
(function clearFocusOnMouseMove() {
  function removeFocus() {
    if (
      document.activeElement &&
      !document.activeElement.classList.contains("input")
    ) {
      document.activeElement.blur();
    }
  }
  // Set up event listeners
  document.addEventListener("mousemove", removeFocus);
})();

// Get Current Year for Copyright
// (function getCurrentYear() {
//   const yearText = document.querySelector(".year-text");
//   const currentYear = new Date().getFullYear();

//   yearText.innerHTML = currentYear;
//   yearText.setAttribute("datetime", currentYear);
// })();
