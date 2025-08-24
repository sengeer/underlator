const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    main: './src/main.js',
    preload: './src/preload.js',
    worker: './src/worker.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist/electron'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },
  externals: [
    nodeExternals({
      allowlist: ['webpack/hot/poll?100'],
      modulesDirs: ['node_modules'],
    }),
    {
      electron: 'commonjs electron',
      fs: 'commonjs fs',
      path: 'commonjs path',
      worker_threads: 'commonjs worker_threads',
    },
  ],
  resolve: {
    extensions: ['.js', '.json'],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true,
        },
      }),
    ],
  },
  devtool: false,
};
