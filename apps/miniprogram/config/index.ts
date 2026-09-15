import { defineConfig, type UserConfigExport } from '@tarojs/cli'

const config: UserConfigExport = {
  projectName: 'food-sense',
  date: '2026-09-09',
  designWidth: 750,
  deviceRatio: {
    375: 2,
    640: 1.17,
    750: 1,
    828: 0.905
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {}
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  }
}

export default defineConfig(config)
