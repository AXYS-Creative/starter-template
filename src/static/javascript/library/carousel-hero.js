const carouselHero = document.querySelector(".carousel-hero");
const carouselHeroSlides = document.querySelectorAll(".carousel-hero__slide");
let currentIndex = 1;

if (carouselHero) {
  let autoplayInterval =
    parseInt(carouselHero.getAttribute("data-carousel-interval"), 10) || 5000;

  if (carouselHeroSlides.length > 0) {
    carouselHeroSlides[0].classList.add("active");
  }

  const updateSlides = () => {
    carouselHeroSlides.forEach((slide) => slide.classList.remove("active"));

    carouselHeroSlides[currentIndex].classList.add("active");

    currentIndex = (currentIndex + 1) % carouselHeroSlides.length;
  };

  setInterval(updateSlides, autoplayInterval);
}
