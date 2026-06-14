import path from 'path';
import webpack from 'webpack';
import slsw from 'serverless-webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  entry: Object.keys(slsw.lib.entries).length
    ? slsw.lib.entries
    : './src/main.ts',
  target: 'node',
  stats: true,
  mode: 'production',
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  ignoreWarnings: [
    (warning) => {
      return (
        warning.message.includes(
          'Critical dependency: the request of a dependency is an expression',
        ) &&
        warning.module &&
        warning.module.resource &&
        (warning.module.resource.includes(
          'node_modules/@nestjs/common/utils/load-package.util.js',
        ) ||
          warning.module.resource.includes(
            'node_modules/@nestjs/core/helpers/load-adapter.js',
          ) ||
          warning.module.resource.includes(
            'node_modules/@nestjs/core/helpers/optional-require.js',
          ) ||
          warning.module.resource.includes(
            'node_modules/express/lib/view.js',
          ) ||
          warning.module.resource.includes(
            'node_modules/dynamoose/dist/utils/importPackage.js',
          ))
      );
    },
  ],
  module: {
    rules: [
      {
        test: /\.([cm]?tsx?|mts)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.resolve(__dirname, '.webpack'),
    filename: '[name].js',
  },
  externals: [
    /^@aws-sdk\/.*/,
    /^@smithy\/.*/,
    /^@nestjs\/microservices(\/.*)?$/,
    /^@nestjs\/microservices(\/.*)?$/,
    /^@nestjs\/graphql(\/.*)?$/,
    /^@nestjs\/websockets(\/.*)?$/,
    '@nuxtjs/opencollective',
    '@fastify/static',
    'bufferutil',
    'utf-8-validate',
  ],
  plugins: [
    // Cleans the output directory to prevent ensure that any build output is
    // outputted to a sterile environment.
    new CleanWebpackPlugin(),
    new webpack.IgnorePlugin({
      resourceRegExp: /require\.extensions/,
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: path.resolve(__dirname, '.out', 'webpack.html'),
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: 'public', to: 'public' }],
    }),
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        default: false,
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          keep_classnames: true,
        },
      }),
    ],
  },
};
