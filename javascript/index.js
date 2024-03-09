import "./nav.js";

// Clear focus from any element on mousemove (remove button :focus styles)
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
// })();

// Media Queries
const minMediaMD = window.matchMedia("(min-width: 768px)");

function handleMediaQueryChange(e) {
  if (e.matches) {
    console.log("The screen is big.");
  } else {
    console.log("The screen is small.");
  }
}

minMediaMD.addEventListener("change", handleMediaQueryChange);

handleMediaQueryChange(minMediaMD);
