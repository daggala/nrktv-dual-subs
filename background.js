// Handle actions sent from content script running within browser context
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case "translate":
        const { text, source_lang, target_lang } = message.payload;
        getTranslation(text, source_lang, target_lang)
          .then((translation) => {
            sendResponse({
              error: null,
              response: translation,
            });
          })
          .catch(() => {
            console.error("bg catch error");
          });
        return true;
      default:
        sendResponse({
          error: new Error(`Unknown action: ${message.action}`),
          response: null,
        });
        return true;
    }
  } catch (error) {
    sendResponse({ error, response: null });
    return false;
  }
});

// Helper function to retrieve a translation from Google Translate API
async function getTranslation(text, source_lang, target_lang) {
  // Build translation query
  const baseURL = `https://clients5.google.com/translate_a/t`;
  let reqURL = baseURL;
  reqURL += `?client=dict-chrome-ex`;
  reqURL += `&q=${encodeURI(text)}`;
  reqURL += `&sl=${source_lang}&tl=${target_lang}&ie=UTF8&oe=UTF8`;

  // Return request response as a promise
  const requestTimeoutMs = 8000;
  return new Promise((resolve, reject) => {
    // Don't leave promise dangling if request fails
    const timeoutRejection = setTimeout(() => {
      reject(new Error("Translation request timed out"));
    }, requestTimeoutMs);

    fetch(reqURL)
      .then((response) => response.json())
      .then((data) => {
        if (data.sentences && Array.isArray(data.sentences)) {
          // Undocumented API response schema until March 2021
          resolve(data.sentences.map((sentence) => sentence.trans).join(""));
        } else if (Array.isArray(data)) {
          // Undocumented API response schema as of March 2021+
          resolve(data.flat(1e9)[0]);
        }
        clearTimeout(timeoutRejection);
      });
  });
}
