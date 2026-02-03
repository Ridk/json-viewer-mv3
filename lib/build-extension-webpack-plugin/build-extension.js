var fs = require('fs-extra');
var path = require('path');
var archiver = require('archiver');
var BuildPaths = require('../build-paths');

function copyTheme(darkness, list) {
  var paths = [];
  list.forEach(function(theme) {
    var themeCSS = theme.replace(/\.js$/, '.css');
    var themeCSSPath = 'themes/' + darkness + '/' + theme + '.css';
    var themePath = path.join(BuildPaths.EXTENSION, 'assets/' + theme);

    if (fs.existsSync(themePath + '.js') && fs.existsSync(themePath + '.css')) {
      fs.removeSync(themePath + '.js');
      fs.copySync(themePath + '.css', path.join(BuildPaths.EXTENSION, themeCSSPath));
      console.log('  copied: ' + themeCSSPath);
      paths.push(themeCSSPath);

    } else {
      console.error('  fail to copy: ' + (themePath + '.css'));
    }
  });

  return paths;
}

function BuildExtension(options) {
  options = options || {};
  // In Webpack 5, custom top-level config properties are not allowed,
  // so we pass themes via plugin options.
  this.themes = options.themes || null;
}
BuildExtension.prototype.apply = function(compiler) {
  compiler.hooks.done.tap('BuildExtension', function() {
    console.log('\n');
    console.log('-> copying files');
    fs.copySync(path.join(BuildPaths.SRC_ROOT, 'icons'), path.join(BuildPaths.EXTENSION, 'icons'));
    fs.copySync(path.join(BuildPaths.SRC_ROOT, 'pages'), path.join(BuildPaths.EXTENSION, 'pages'));

    console.log('-> copying themes');

    // Backward-compatible: prefer plugin options, fall back to compiler.options.themes
    // for older configs.
    var availableThemes = this.themes || compiler.options.themes;
    if (!availableThemes) {
      availableThemes = { light: [], dark: [] };
    }
    var themesCSSPaths = copyTheme('light', availableThemes.light).
                         concat(copyTheme('dark', availableThemes.dark));

    var manifest = fs.readJSONSync(path.join(BuildPaths.SRC_ROOT, 'manifest.json'));
    // MV3 uses [{resources:[...], matches:[...]}] format.
    if (Array.isArray(manifest.web_accessible_resources) && manifest.web_accessible_resources.length > 0) {
      if (typeof manifest.web_accessible_resources[0] === 'object' && manifest.web_accessible_resources[0].resources) {
        manifest.web_accessible_resources[0].resources = manifest.web_accessible_resources[0].resources.concat(themesCSSPaths);
      } else {
        manifest.web_accessible_resources = manifest.web_accessible_resources.concat(themesCSSPaths);
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('-> dev version');
      manifest.name += ' - dev';
    }

    console.log('-> copying manifest.json');
    fs.outputJSONSync(path.join(BuildPaths.EXTENSION, 'manifest.json'), manifest);
  }.bind(this));
}

module.exports = BuildExtension;
