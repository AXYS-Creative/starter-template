const contactForm = document.querySelector(".form-feedback"),
  statusMessage = document.querySelector(".form-feedback .status-message"),
  emailInput = document.querySelector(".form-feedback .input-email");

const errorClasses = ["error-message", "active"];
const successClasses = ["success-message", "active"];

if (contactForm) {
  const handleSubmit = (event) => {
    event.preventDefault();

    const email = emailInput.value;
    let submittedEmails =
      JSON.parse(localStorage.getItem("submittedEmails")) || [];

    if (submittedEmails.includes(email)) {
      statusMessage.innerHTML = `
        ⚠️ Error! This email has already been submitted.
      `;
      statusMessage.classList.add(...errorClasses);

      setTimeout(function () {
        statusMessage.classList.remove("active");
      }, 8000);

      setTimeout(function () {
        statusMessage.innerHTML = "";
        statusMessage.classList.remove("error-message");
      }, 9000);

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
        statusMessage.innerHTML = `
          ✅ Message recieved! We’ll get back to you shortly.
        `;
        statusMessage.classList.add(...successClasses);

        setTimeout(function () {
          statusMessage.classList.remove("active");
        }, 8000);

        setTimeout(function () {
          statusMessage.innerHTML = "";
          statusMessage.classList.remove("success-message");
        }, 9000);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        alert(error);
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
