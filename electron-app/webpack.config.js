const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    main: './src/main.ts',
    preload: './src/preload.ts',
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
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
            transpileOnly: false,
          },
        },
        exclude: /node_modules/,
      },
    ],
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
