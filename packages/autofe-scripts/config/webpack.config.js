const path = require('path');
const glob = require('glob');
const paths = require('./paths');

const context = paths.appDirectory;

function getEntries() {
  const entries = {};
  const entryFiles = glob.sync('**/*.entry.js', {
    cwd: path.join(context, 'src'),
  });

  for (let i = 0; i < entryFiles.length; i += 1) {
    const filePath = entryFiles[i];
    const key = path.join(path.dirname(filePath), path.basename(filePath, '.entry.js'));
    entries[key] = `.${path.sep}${path.join('src', filePath)}`;
  }

  console.log(entries);

  return entries;
}

module.exports = () => ({
  // TODO only for development
  devtool: 'eval',
  context,
  entry: getEntries(),
  output: {
    filename: '[name].js',
    chunkFilename: '[name].js',
    path: path.join(context, 'build'),
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['env', {
                modules: false,
                target: {
                  browsers: ['last 2 versions', 'ie >= 7', 'safari >= 7'],
                  // browsers: ['ios >= 6', 'android >= 4.0', 'Explorer >= 6', 'Firefox >= 20', 'Opera > 10'],
                },
              }],
            ],
            plugins: [
              'syntax-dynamic-import',
            ],
          },
        },
      },
    ],
  },
});
