'use strict';

const path = require('path');
const glob = require('glob');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
// const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require('copy-webpack-plugin');
const AutoFEWebpack = require("autofe-webpack");
const {
  resolveModule,
  // loadModule,
} = require('@vue/cli-shared-utils')
const config = require('./index');

const isProd = process.env.NODE_ENV === 'production';

const context = config.appDirectory;

/**
 * 获取入口文件
 */
function getEntries() {
  const entries = {};

  const entryFiles = glob.sync('**/*.entry.js', {
    cwd: config.appSrc,
  });
  for (let i = 0; i < entryFiles.length; i += 1) {
    const filePath = entryFiles[i];
    const key = path.join(path.dirname(filePath), path.basename(filePath, '.entry.js'));
    entries[key] = `.${path.sep}${path.join('src', filePath)}`;
  }

  const entryStyleFiles = glob.sync('**/!(_)*.{scss,css}', {
    cwd: config.appSrc,
  });
  for (let i = 0; i < entryStyleFiles.length; i += 1) {
    const filePath = entryStyleFiles[i];
    const key = path.join(path.dirname(filePath), path.parse(filePath).name);
    entries[key] = `.${path.sep}${path.join('src', filePath)}`;
  }
  // TODO: 可能存在 key 相同的情况

  return entries;
}

/**
 * 配置 file-loader 资源文件名
 */
function getNameForFileLoader() {
  return isProd
    ? '[path][name].[ext]?[contenthash:8]'
    : '[path][name].[ext]';
}

/**
 * 获取 file-loader 资源输出路径，与 src 下目录保持一致
 * @param {String} url file-loader 的 name 配置，`[path][name].[ext]`
 * @param {String} resourcePath 资源的绝对路径
 * @param {String} context 上下文，参考 webpack 的 context 配置
 */
function getOutputPathForFileLoader(url) {
  // To get relative path you can use
  // const relativePath = path.relative(context, resourcePath);

  let output;
  if (url.indexOf('src') === 0) {
    output = path.relative('src', url);
  } else if (url.indexOf('node_modules') === 0) {
    output = path.relative('node_modules', url);
  } else {
    output = url;
  }

  return output;
}

function getDevtool() {
  // dev
  // 推荐 cheap-module-eval-source-map，vue-cli 也是用这个
  // 但是配合 style-loader 使用比较好，MiniCssExtractPlugin.loader 不支持
  // 因此使用 inline-cheap-module-source-map
  // 因为 MiniCssExtractPlugin.loader 支持

  // prod
  // 推荐 false
  // 可以使用 source-map

  if (isProd) {
    return false;
  }
  return 'inline-cheap-module-source-map';
}

module.exports = () => {
  const entries = getEntries();

  return {
    mode: isProd ? 'production' : 'development',
    context,
    devtool: getDevtool(),
    entry: entries,
    output: {
      filename: '[name].js',
      chunkFilename: '[name].js',
      path: config.appBuild,
      publicPath: '/',
    },
    externals: config.externals,
    resolve: {
      alias: {
        '@': config.appSrc,
        // Resolve Babel runtime relative to autofe-scripts.
        // It usually still works on npm 3 without this but it would be
        // unfortunate to rely on, as autofe-scripts could be symlinked,
        // and thus babel-runtime might not be resolvable from the source.
        'babel-runtime': path.dirname(
          require.resolve('babel-runtime/package.json')
        ),
      },
      modules: [
        'node_modules',
        path.join(context, 'node_modules'),
        path.join(context, 'node_modules/autofe-scripts/node_modules'),
      ],
    },
    resolveLoader: {
      modules: [
        path.join(context, 'node_modules/babel-preset-autofe-app/node_modules'),
        path.join(context, 'node_modules/eslint-config-autofe-app/node_modules'),
        'node_modules',
        path.join(context, 'node_modules'),
        path.join(context, 'node_modules/autofe-scripts/node_modules'),
      ],
    },
    module: {
      rules: [
        // eslint
        {
          enforce: 'pre',
          test: /\.js$/,
          include: config.appSrc,
          use: [
            {
              loader: require.resolve('eslint-loader'),
              options: {
                // TODO: cache 需要 cacheIdentifier，参考 vue-cli
                // cache: true,
                emitWarning: true,
                emitError: true,
                eslintPath: path.dirname(
                  resolveModule('eslint/package.json', context) ||
                  resolveModule('eslint/package.json', __dirname)
                ),
              },
            },
          ],
        },
        // js
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              presets: [require.resolve('babel-preset-autofe-app')],
            },
          },
        },
        // css
        {
          test: /\.css$/,
          use: [
            {
              // output based on entry
              // https://github.com/webpack-contrib/file-loader/issues/114
              // https://github.com/webpack-contrib/mini-css-extract-plugin#extracting-css-based-on-entry
              // function findEntry(mod) {
              //   if (mod.reasons.length > 0 && mod.reasons[0].module.resource) {
              //       return findEntry(mod.reasons[0].module)
              //   }
              //   return mod.resource;
              // }
              loader: MiniCssExtractPlugin.loader,
              options: {
                // hmr: process.env.NODE_ENV === 'development',
                // if hmr does not work, this is a forceful method.
                // reloadAll: true,
              },
            },
            {
              loader: require.resolve('css-loader'),
              options: {
                sourceMap: !isProd,
              },
            },
            {
              loader: require.resolve('postcss-loader'),
              options: {
                sourceMap: !isProd,
              },
            },
          ]
        },
        // scss
        {
          test: /\.scss$/,
          use: [
            {
              // output based on entry
              // https://github.com/webpack-contrib/file-loader/issues/114
              // https://github.com/webpack-contrib/mini-css-extract-plugin#extracting-css-based-on-entry
              // function findEntry(mod) {
              //   if (mod.reasons.length > 0 && mod.reasons[0].module.resource) {
              //       return findEntry(mod.reasons[0].module)
              //   }
              //   return mod.resource;
              // }
              loader: MiniCssExtractPlugin.loader,
              options: {
                // hmr: process.env.NODE_ENV === 'development',
                // if hmr does not work, this is a forceful method.
                // reloadAll: true,
              },
            },
            {
              loader: require.resolve('css-loader'),
              options: {
                sourceMap: !isProd,
              },
            },
            {
              loader: require.resolve('postcss-loader'),
              options: {
                sourceMap: !isProd,
              },
            },
            // TODO 处理 image-set( "cat.png" 1x, "cat-2x.png" 2x);
            {
              loader: require.resolve('resolve-url-loader'),
              options: {
                keepQuery: true, // for loader resourceQuery
                sourceMap: !isProd,
              },
            },
            {
              loader: require.resolve('sass-loader'),
              options: {
                // Notice: resolve-url-loader need this! so set sourceMap true always
                // 该配置不产生 map 文件, 只产生 map 内容
                sourceMap: true,
                // 参考 vue-cli
                // prependData: '@import "@/assets/athm/tools.scss";'
                // Prefer `dart-sass`, you need to install sass and fibers
                // implementation: require('sass'),
              },
            },
          ]
        },
        // images
        {
          test: /\.(png|jpe?g|gif|webp|cur)(\?.*)?$/,
          oneOf: (() => {
            const imageDataUriLoaderConfig = {
              loader: require.resolve('url-loader'),
              options: {
                limit: true, // no limit
              },
            };

            const imageUrlLoaderConfig = {
              loader: require.resolve('url-loader'),
              options: {
                // url-loader options
                limit: 1024, // limit 1kb
                // file-loader options
                name: getNameForFileLoader,
                outputPath: getOutputPathForFileLoader,
              },
            };

            return [
              {
                resourceQuery: /datauri/,
                use: [imageDataUriLoaderConfig],
              },
              {
                use: [imageUrlLoaderConfig],
              },
            ];
          })(),
        },
        // svg
        {
          test: /\.svg$/,
          oneOf: (() => {
            const svgoLoaderConfig = {
              loader: require.resolve('svgo-loader'),
              options: {
                plugins: [
                  { removeViewBox: false },
                  { cleanupIDs: false }
                ]
              },
            };

            const svgInlineLoaderConfig = {
              loader: require.resolve('svg-inline-loader'),
              options: {
                removeSVGTagAttrs: false,
              },
            };

            const svgDataUriLoaderConfig = {
              loader: require.resolve('svg-url-loader'),
              options: {
                limit: 0, // no limit
                stripdeclarations: true,
              },
            };

            const svgUrlLoaderConfig = {
              loader: require.resolve('svg-url-loader'),
              options: {
                // svg-url-loader options
                limit: 1024, // limit 1kb
                stripdeclarations: true,
                // file-loader options
                name: getNameForFileLoader,
                outputPath: getOutputPathForFileLoader,
              },
            };

            const baseLoaderConfig = [];
            if (isProd) {
              baseLoaderConfig.push(svgoLoaderConfig);
            }

            return [
              {
                resourceQuery: /inline/,
                use: [svgInlineLoaderConfig].concat(baseLoaderConfig),
              },
              {
                resourceQuery: /datauri/,
                use: [svgDataUriLoaderConfig].concat(baseLoaderConfig),
              },
              {
                use: [svgUrlLoaderConfig].concat(baseLoaderConfig),
              },
            ];
          })(),
        },
        // fonts
        {
          test: /\.(eot|ttf|otf|woff2?)(\?.*)?$/,
          use: [
            {
              loader: require.resolve('url-loader'),
              options: {
                // url-loader options
                limit: 1024, // limit 1kb
                // file-loader options
                name: getNameForFileLoader,
                outputPath: getOutputPathForFileLoader,
              },
            },
          ],
        },
        // media
        {
          test: /\.(mp4|webm|ogv|flv|mp3|ogg|wav|flac|acc)$/,
          use: [
            {
              loader: require.resolve('url-loader'),
              options: {
                // url-loader options
                limit: 1024, // limit 1kb
                // file-loader options
                name: getNameForFileLoader,
                outputPath: getOutputPathForFileLoader,
              },
            },
          ],
        },
      ],
    },
    optimization: {
      minimizer: [
        // new TerserPlugin({
        //   parallel: true,
        //   terserOptions: {
        //     safari10: true,
        //     compress: {
        //       warnings: false,
        //       drop_debugger: true,
        //       drop_console: true,
        //     },
        //     output: {
        //       ascii_only: true,
        //       quote_style: 1,
        //     },
        //   },
        // }),
        new UglifyJsPlugin({
          uglifyOptions: {
            output: {
              ascii_only: true,
            },
          },
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorPluginOptions: {
            preset: ['default', {
              cssDeclarationSorter: false,
              discardComments: { removeAll: true },
              mergeLonghand: false,
            }],
          },
        }),
      ],
    },
    plugins: [
      new CopyPlugin(
        [
          {
            from: path.join(context, 'public'),
            to: config.appBuild,
            toType: 'dir',
            ignore: [
              '.DS_Store'
            ],
          },
          {
            from: 'src/**/*.{eot,ttf,otf,woff,woff2}',
            to: getNameForFileLoader(),
            toType: 'template',
            transformPath(targetPath) {
              return path.relative('src', targetPath);
            },
          },
          {
            from: 'src/**/*.{png,jpg,jpeg,gif,webp,cur}',
            to: getNameForFileLoader(),
            toType: 'template',
            transformPath(targetPath) {
              return path.relative('src', targetPath);
            },
          },
          {
            from: 'src/**/*.{mp4,webm,ogv,flv,mp3,ogg,wav,flac,acc}',
            to: getNameForFileLoader(),
            toType: 'template',
            transformPath(targetPath) {
              return path.relative('src', targetPath);
            },
          },
          {
            from: 'src/**/*.{ico,json,txt,swf}',
            to: getNameForFileLoader(),
            toType: 'template',
            transformPath(targetPath) {
              return path.relative('src', targetPath);
            },
          },
        ],
      ),
      new AutoFEWebpack.OmitJsForCssOnlyPlugin(),
      // url(...) 不能是绝对路径, 否则 CssUrlRelativePlugin 没办法处理成相对路径
      // TODO 处理 image-set( "cat.png" 1x, "cat-2x.png" 2x);
      new AutoFEWebpack.CssUrlRelativePlugin({
        root: '/',
      }),
      new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: "[name].css",
        chunkFilename: '[name].css',
      }),
    ],
  };
};
