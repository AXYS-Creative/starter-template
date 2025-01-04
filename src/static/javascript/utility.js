// export const root = document.documentElement; See portfolio for examples

export const mqMouse = window.matchMedia("(hover: hover) and (pointer: fine)");

// Get current year for copyright
{
  const yearText = document.querySelector(".year-text");
  const currentYear = new Date().getFullYear();

  yearText.innerHTML = currentYear;
  yearText.setAttribute("datetime", currentYear);
}

// Return to top
{
  const returnToTop = document.querySelector(".return-to-top"),
    logo = document.querySelector(".header-logo");

  returnToTop.addEventListener("click", (e) => {
    logo.focus();
  });
}
