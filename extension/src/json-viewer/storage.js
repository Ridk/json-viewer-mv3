var chrome = require('chrome-framework');

var defaults = require('./options/defaults');
var merge = require('./merge');

var OLD_NAMESPACE = 'options';
var NAMESPACE = 'v2.options';

function getStorageArea() {
  // MV3 service worker & modern extensions should use chrome.storage.
  if (chrome && chrome.storage && chrome.storage.local) return chrome.storage.local;
  return null;
}

function normalizeOptions(raw) {
  var options = raw && typeof raw === 'object' ? raw : {};

  options.theme = options.theme || defaults.theme;
  options.addons = options.addons ? JSON.parse(options.addons) : {};
  options.addons = merge({}, defaults.addons, options.addons);
  options.structure = options.structure ? JSON.parse(options.structure) : defaults.structure;
  options.style = options.style && options.style.length > 0 ? options.style : defaults.style;
  return options;
}

function tryLocalStorageMigration() {
  // localStorage does not exist in MV3 service worker; guard heavily.
  if (typeof localStorage === 'undefined') return null;

  var optionsStr = localStorage.getItem(NAMESPACE);
  if (optionsStr !== null) return optionsStr;

  // Migrate v1 -> v2 namespace
  var oldOptions = localStorage.getItem(OLD_NAMESPACE);
  if (oldOptions === null) return null;

  try {
    oldOptions = JSON.parse(oldOptions);
    if (!oldOptions || typeof oldOptions !== 'object') oldOptions = {};

    var options = {};
    options.theme = oldOptions.theme;
    options.addons = {
      prependHeader: JSON.parse(oldOptions.prependHeader || defaults.addons.prependHeader),
      maxJsonSize: parseInt(oldOptions.maxJsonSize || defaults.addons.maxJsonSize, 10),
    };

    if (options.addons.maxJsonSize < defaults.addons.maxJsonSize) {
      options.addons.maxJsonSize = defaults.addons.maxJsonSize;
    }

    options.addons = JSON.stringify(options.addons);
    options.structure = JSON.stringify(defaults.structure);
    options.style = defaults.style;

    localStorage.setItem(NAMESPACE, JSON.stringify(options));
    localStorage.removeItem(OLD_NAMESPACE);
    return JSON.stringify(options);
  } catch (e) {
    try {
      console.error('[JSONViewer] storage migrate error: ' + e.message, e);
    } catch (_) {}
    return null;
  }
}

module.exports = {
  save: function (obj) {
    var area = getStorageArea();
    if (!area) {
      // fallback for very old environments
      if (typeof localStorage !== 'undefined') localStorage.setItem(NAMESPACE, JSON.stringify(obj));
      return Promise.resolve();
    }
    return area.set({ [NAMESPACE]: obj });
  },

  load: function () {
    var area = getStorageArea();
    if (!area) {
      var ls = tryLocalStorageMigration();
      var parsed = ls ? JSON.parse(ls) : {};
      return Promise.resolve(normalizeOptions(parsed));
    }

    return new Promise(function (resolve) {
      area.get([NAMESPACE], function (result) {
        var raw = result ? result[NAMESPACE] : null;
        var migratedFromLocalStorage = false;
        if (!raw) {
          // Try to migrate from localStorage (options page/content script)
          var ls = tryLocalStorageMigration();
          if (ls) {
            try {
              raw = JSON.parse(ls);
              migratedFromLocalStorage = true;
            } catch (_) {
              raw = null;
            }
          }
        }

        if (raw) {
          // Ensure stored format stays as object under chrome.storage
          if (migratedFromLocalStorage && typeof raw === 'object') {
            area.set({ [NAMESPACE]: raw }, function () {
              resolve(normalizeOptions(raw));
            });
            return;
          }
          resolve(normalizeOptions(raw));
        } else {
          resolve(normalizeOptions({}));
        }
      });
    });
  },
};
