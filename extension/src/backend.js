var chrome = require('chrome-framework');
var Storage = require('./json-viewer/storage');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  try {
    if (request.action === "GET_OPTIONS") {
      Storage.load()
        .then(function (value) {
          sendResponse({ err: null, value: value });
        })
        .catch(function (e) {
          console.error('[JSONViewer] error: ' + e.message, e);
          sendResponse({ err: e && e.message ? e.message : e });
        });
      return true; // keep the message channel open for async response (MV3)
    }
  } catch(e) {
    console.error('[JSONViewer] error: ' + e.message, e);
    sendResponse({err: e});
  }
});
