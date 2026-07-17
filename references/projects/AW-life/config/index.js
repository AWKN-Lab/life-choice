const path = require('path');

module.exports = {
  projectName: 'awkn-life-mini',
  date: '2026-4-10',
  framework: 'react',
  designWidth: 375,
  deviceRatio: {
    640: 2 / 750,
    750: 1,
    828: 375 / 414,
    375: 375 / 750,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-platform-weapp'],
  doctor: { enabled: false },
  alias: {
    '@/components': path.resolve(__dirname, '../src/components'),
    '@/pages': path.resolve(__dirname, '../src/pages'),
    '@/utils': path.resolve(__dirname, '../src/utils'),
    '@/store': path.resolve(__dirname, '../src/store'),
  },
  compiler: 'webpack5',
  cache: { enable: true },
  mini: {
    compile: { include: [() => true] },
    commonChunks: ['runtime', 'vendors', 'main'],
    postcss: {
      pxtransform: { enable: true },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    esbuild: {},
  },
};
