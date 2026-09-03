import { showAlert } from "./alert.js";

const contactForm = document.querySelector(".form-feedback"),
  emailInput = document.querySelector(".form-feedback .input-email"),
  successAlert = document.querySelector('.form-feedback .alert[data-alert-type="success"]'),
  errorAlert = document.querySelector('.form-feedback .alert[data-alert-type="error"]'),
  errorMessageEl = errorAlert?.querySelector(".alert-content__message"),
  errorMessageDefault = errorMessageEl?.textContent;

if (contactForm) {
  const handleSubmit = (event) => {
    event.preventDefault();

    const email = emailInput.value;
    let submittedEmails =
      JSON.parse(localStorage.getItem("submittedEmails")) || [];

    if (submittedEmails.includes(email)) {
      if (errorMessageEl) {
        errorMessageEl.textContent = "This email has already been submitted.";
      }
      showAlert(errorAlert);
      return;
    } else {
      submittedEmails.push(email);
      localStorage.setItem("submittedEmails", JSON.stringify(submittedEmails));
    }

    const myForm = event.target;
    const formData = new FormData(myForm);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString(),
    })
      .then(() => {
        showAlert(successAlert);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        if (errorMessageEl) {
          errorMessageEl.textContent = errorMessageDefault;
        }
        showAlert(errorAlert);
      });
  };

  contactForm.addEventListener("submit", handleSubmit);
}

//
// Textarea max character count
//

const textareaCount = (() => {
  const textarea = document.querySelector(".form-feedback .input-message");
  const charCountLabel = document.querySelector(".form-feedback .nested-label");
  const maxLength = textarea?.maxLength;

  const updateCharCount = () => {
    const remaining = maxLength - textarea.value.length;
    charCountLabel.textContent =
      remaining === maxLength
        ? `Max — ${maxLength} characters`
        : `${remaining} character${remaining === 1 ? "" : "s"} remaining`;

    charCountLabel.classList.toggle("text-error", remaining === 0);
  };

  if (maxLength) {
    updateCharCount();
    textarea?.addEventListener("input", updateCharCount);
  }
})();
