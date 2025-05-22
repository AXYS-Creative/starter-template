// // Handles the replacement logic for [%br%] tokens
// const brTokenHandler = (() => {
//   const processBrToken = (inputString) => {
//     return inputString.replace(/\[%br(\.[^\]]+)?%\]/g, (match, className) => {
//       if (className) {
//         const cleanClass = className.substring(1);
//         return `<br class="${cleanClass}" aria-hidden="true">`;
//       }
//       return `<br aria-hidden="true">`;
//     });
//   };

//   return {
//     process: processBrToken,
//   };
// })();

// // Handles the replacement logic for [%span%] tokens
// const spanTokenHandler = (() => {
//   const processSpanToken = (inputString) => {
//     return inputString.replace(
//       /\[%span(\.[^\]]+)?%\](.*?)\[%span%\]/g,
//       (match, className, content) => {
//         if (className) {
//           const cleanClass = className.substring(1);
//           return `<span class="${cleanClass}">${content}</span>`;
//         }
//         return `<span>${content}</span>`;
//       }
//     );
//   };

//   return {
//     process: processSpanToken,
//   };
// })();

// // Central token processor that applies all token handlers
// const tokenProcessor = (() => {
//   const processTokens = (inputString) => {
//     let outputString = inputString;

//     // Process each token handler separately
//     outputString = brTokenHandler.process(outputString);
//     outputString = spanTokenHandler.process(outputString);

//     return outputString;
//   };

//   const elements = document.querySelectorAll(`
//     p,
//     span,
//     h1,
//     h2,
//     h3,
//     h4,
//     h5,
//     h6,
//     small
//   `);

//   elements.forEach((element) => {
//     const content = element.innerHTML;

//     if (
//       content.includes("[%br%]") ||
//       content.includes("[%br.") ||
//       content.includes("[%span%]") ||
//       content.includes("[%span.")
//     ) {
//       const wrappedContent = processTokens(content);
//       element.innerHTML = wrappedContent;
//     }
//   });
// })();
