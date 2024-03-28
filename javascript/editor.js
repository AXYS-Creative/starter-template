// editor.js
import { isLoggedIn, createEditorButton } from "./auth.js";

const initEditor = async () => {
  const userLoggedIn = await isLoggedIn();

  if (userLoggedIn) {
    setupEditorButton();
  } else {
    console.log("User is not logged in. Editor functionality disabled.");
  }
};

const setupEditorButton = () => {
  // Assuming createEditorButton creates the editor button element
  const editorBtn = createEditorButton();
  document.body.appendChild(editorBtn);

  // Setup event listeners for the editor button
  editorBtn.addEventListener("click", () => {
    console.log("mock editing");
  });
};

initEditor();
