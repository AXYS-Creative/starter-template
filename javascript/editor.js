const editBtn = document.querySelector(".edit");
const modal = document.getElementById("editorModal");
const closeBtn = document.querySelector(".close-button");
const saveBtn = document.getElementById("saveBtn");
const firstFocusableElement = closeBtn; // Assuming the close button is the first focusable element
const focusableContent = modal.querySelectorAll(
  'input, textarea, button, [tabindex="0"]'
);
const lastFocusableElement = focusableContent[focusableContent.length - 1];

let isModalOpen = false;

const toggleModal = () => {
  console.log("clicked");
  isModalOpen = !isModalOpen;
  modal.style.display = isModalOpen ? "block" : "none";
  modal.setAttribute("aria-hidden", String(!isModalOpen));

  if (isModalOpen) {
    document.addEventListener("keydown", trapTabKey);
    firstFocusableElement.focus();
  } else {
    document.removeEventListener("keydown", trapTabKey);
    editBtn.focus();
  }
};

const trapTabKey = (e) => {
  if (e.key === "Tab") {
    if (e.shiftKey) {
      /* shift + tab */ if (document.activeElement === firstFocusableElement) {
        e.preventDefault();
        lastFocusableElement.focus();
      }
    } /* tab */ else {
      if (document.activeElement === lastFocusableElement) {
        e.preventDefault();
        firstFocusableElement.focus();
      }
    }
  }

  if (e.key === "Escape") {
    toggleModal();
  }
};

if (editBtn) {
  editBtn.addEventListener("click", toggleModal);
}

closeBtn.addEventListener("click", toggleModal);

saveBtn.addEventListener("click", () => {
  // Implement save logic here
  toggleModal();
  console.log("Changes saved");
});

// Clicking outside of the modal will close it
window.onclick = function (event) {
  if (event.target == modal) {
    toggleModal();
  }
};
