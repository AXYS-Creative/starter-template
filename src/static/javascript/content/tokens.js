// CMS Token - Any string element can use the token '[%br%]' or '[%br.class-name%]' to inject a <br> tag with optional classes.
const lineWrapToken = (() => {
  const lineWrap = (inputString) => {
    // Match tokens like [%br%] or [%br.class-name%]
    return inputString.replace(/\[%br(\.[^\]]+)?%\]/g, (match, className) => {
      // If a class name is provided, clean it and add it to the <br> tag
      if (className) {
        const cleanClass = className.substring(1); // Remove the leading '.'
        return `<br class="${cleanClass}" aria-hidden="true">`;
      }
      // Default <br> for [%br%] token
      return `<br aria-hidden="true">`;
    });
  };

  const elements = document.querySelectorAll(`
      p,
      span,
      h1, 
      h2, 
      h3, 
      h4, 
      h5, 
      h6
  `);

  elements.forEach((element) => {
    const content = element.innerHTML;

    if (content.includes("[%br%]") || content.includes("[%br.")) {
      const wrappedContent = lineWrap(content);
      element.innerHTML = wrappedContent;
    }
  });
})();
