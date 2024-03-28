const fetchAdminUser = () => {
  return fetch("/.netlify/functions/getAdminUser")
    .then((response) => response.json())
    .then((data) => {
      return data.adminUser;
    })
    .catch((error) => {
      console.error("Error fetching admin user:", error);
      return null;
    });
};

export const createEditorButton = () => {
  const editorBtnHTML = `
    <button class="admin-edit-btn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"/>
      </svg>
    </button>
  `;
  let template = document.createElement("template");
  template.innerHTML = editorBtnHTML.trim();
  return template.content.firstChild;
};

const handleEditorButton = (isAdmin) => {
  const documentBody = document.body;
  const editorBtn =
    document.querySelector(".admin-edit-btn") || createEditorButton();

  if (isAdmin) {
    documentBody.classList.add("admin-edit");
    if (!documentBody.contains(editorBtn)) {
      documentBody.appendChild(editorBtn);
    }
  } else {
    if (documentBody.contains(editorBtn)) {
      editorBtn.remove();
    }
  }
};

const checkAdminStatus = async () => {
  const adminUser = await fetchAdminUser();
  let activeUser = document.querySelector(".netlify-identity-user");

  if (activeUser && adminUser) {
    const isAdmin = activeUser.innerHTML === adminUser;
    handleEditorButton(isAdmin);
  }
};

checkAdminStatus();

// Function to be used throughout the app
export const isLoggedIn = async () => {
  const adminUser = await fetchAdminUser();
  let activeUser = document.querySelector(".netlify-identity-user");

  return activeUser && activeUser.innerHTML === adminUser;
};
