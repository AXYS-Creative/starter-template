const adminUsers = ["aaronegg123@gmail.com"];

const config = { childList: true, subtree: true };

const callback = (mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      let activeUser = document.querySelector(".netlify-identity-user");
      if (activeUser) {
        console.log("Active user found. Observer disconnected.");

        if (adminUsers.includes(activeUser.innerHTML)) {
          console.log("You are logged in as an admin");
        } else {
          console.log("NOT an admin");
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

observer.observe(document.body, config);
