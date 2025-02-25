if (document.querySelector(".contact-form")) {
  // Telephone Regex
  const phoneInput = document.getElementById("phone");
  phoneInput.addEventListener("input", () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, ""); // Remove all non-digits
  });

  // Textarea max character count
  const textarea = document.querySelector(".input--textarea");
  const nestedLabel = document.querySelector(".nested-label");
  const maxLength = textarea?.maxLength;

  const updateCharCount = () => {
    const remaining = maxLength - textarea.value.length;

    if (nestedLabel) {
      nestedLabel.textContent =
        remaining === maxLength
          ? `Max — ${maxLength} characters`
          : `${remaining} character${remaining === 1 ? "" : "s"} remaining`;

      // nestedLabel.classList.toggle("text-error", remaining === 0);
    }
  };

  if (maxLength) {
    updateCharCount();
    textarea.addEventListener("input", updateCharCount);
  }

  // reCAPTCHA
  const recaptcha = document.querySelector(".g-recaptcha");

  recaptcha?.setAttribute("data-theme", "dark");
}
