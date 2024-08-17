// Get Current Year for Copyright
const getCurrentYear = (() => {
  const yearText = document.querySelector(".year-text");
  const currentYear = new Date().getFullYear();

  yearText.innerHTML = currentYear;
  yearText.setAttribute("datetime", currentYear);
})();

// For any 'return to top' link
const handleReturnToTop = (() => {
  const returnToTop = document.querySelector(".return-to-top"),
    logo = document.querySelector(".header-logo");

  returnToTop.addEventListener("click", (e) => {
    logo.focus();
  });
})();
