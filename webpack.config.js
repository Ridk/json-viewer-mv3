const path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const BuildPaths = require('./lib/build-paths');
const BuildExtension = require('./lib/build-extension-webpack-plugin');

const srcManifest = fs.readJSONSync(path.join(BuildPaths.SRC_ROOT, 'manifest.json'));
const version = srcManifest.version;

const entries = {
  viewer: ['./extension/src/viewer.js'],
  'viewer-alert': ['./extension/styles/viewer-alert.scss'],
  options: ['./extension/src/options.js'],
  // MV3 background service worker entry (bundles backend + omnibox)
  service_worker: ['./extension/src/service-worker.js'],
  'omnibox-page': ['./extension/src/omnibox-page.js'],
};

function findThemes(darkness) {
  return fs
    .readdirSync(path.join('extension', 'themes', darkness))
    .filter((filename) => /\.js$/.test(filename))
    .map((theme) => theme.replace(/\.js$/, ''));
}

function includeThemes(darkness, list) {
  list.forEach((filename) => {
    entries[filename] = [`./extension/themes/${darkness}/${filename}.js`];
  });
}

const lightThemes = findThemes('light');
const darkThemes = findThemes('dark');
const themes = { light: lightThemes, dark: darkThemes };

includeThemes('light', lightThemes);
includeThemes('dark', darkThemes);

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';
  const isProd = mode === 'production';

  return {
    mode,
    context: __dirname,
    entry: entries,
    output: {
      path: path.join(__dirname, 'build/json_viewer/assets'),
      filename: '[name].js',
      clean: false,
    },
    module: {
      rules: [
        {
          test: /\.(css|scss)$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.css', '.scss'],
      modules: [path.resolve(__dirname, './extension'), 'node_modules'],
    },
    externals: {
      'chrome-framework': 'chrome',
    },
    plugins: [
      new CleanWebpackPlugin({ cleanOnceBeforeBuildPatterns: ['build'] }),
      new MiniCssExtractPlugin({ filename: '[name].css' }),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV || mode),
          VERSION: JSON.stringify(version),
          THEMES: JSON.stringify(themes),
        },
      }),
      new BuildExtension({ themes }),
    ],
    optimization: {
      minimize: isProd,
    },
    devtool: false,
    stats: 'errors-warnings',
    infrastructureLogging: { level: 'warn' },
  };
};
