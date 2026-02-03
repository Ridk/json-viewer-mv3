var Promise = require('promise');
var chrome = require('chrome-framework');

function getOptions() {
  return new Promise(function(resolve, reject) {
    chrome.runtime.sendMessage({action: "GET_OPTIONS"}, function(response) {
      if (!response) {
        return reject('getOptions: empty response');
      }

      var err = response.err;
      var value = response.value;

      if (err) {
        reject('getOptions: ' + (err.message || err));

      } else {
        resolve(value);
      }
    });
  });
}

module.exports = getOptions;
