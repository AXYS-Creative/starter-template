fetch("/.netlify/functions/getAdminUser")
  .then((response) => response.json())
  .then((data) => {
    console.log("Admin user:", data.adminUser);
    // You can now use the admin user info as needed
  })
  .catch((error) => console.error("Error fetching admin user:", error));

// const adminUsers = ["aaronegg123@gmail.com"];
// const adminUser = process.env.ADMIN_USER;

console.log(adminUser);

const documentBody = document.body;

const editorBtnHTML = `
  <button class="admin-edit-btn">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <path
      d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"
    />
  </svg>
  </button>
`;

const htmlToElement = (html) => {
  let template = document.createElement("template");
  template.innerHTML = html.trim(); // Never return a text node of whitespace as the result
  return template.content.firstChild;
};

const editorBtn = htmlToElement(editorBtnHTML);

// Testing editor button
documentBody.appendChild(editorBtn);

//
//
//

const config = { childList: true, subtree: true };

const callback = (mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      let activeUser = document.querySelector(".netlify-identity-user");
      if (activeUser) {
        console.log("Active user found. Observer disconnected.");

        if (activeUser.innerHTML === adminUser) {
          console.log("You are logged in as an admin");
          documentBody.classList.add("admin-edit");
          if (!documentBody.contains(editorBtn)) {
            // Check if editorBtn is not already appended
            documentBody.appendChild(editorBtn);
          }
        } else {
          console.log("NOT an admin");
          if (documentBody.contains(editorBtn)) {
            // Check if editorBtn is appended
            editorBtn.remove(); // Remove editorBtn from the DOM
          }
        }

        // Once the element is found, disconnect the observer and clear the timeout
        observer.disconnect();
        clearTimeout(timeoutId);
        break; // Stop looping through mutations once the element is found
      }
    }
  }
};

const observer = new MutationObserver(callback);

const timeoutDuration = 5000;

// Set a timeout to stop observing if the element isn't found within the duration
const timeoutId = setTimeout(() => {
  observer.disconnect();
  console.log(
    `Timeout reached. Observer disconnected without finding the element.`
  );
}, timeoutDuration);

observer.observe(documentBody, config);
