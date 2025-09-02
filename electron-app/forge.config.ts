import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import type { Configuration } from 'webpack';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Получает __dirname для ES модулей
 * В ES модулях __dirname не определен, поэтому fileURLToPath
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Webpack конфигурация для main процесса Electron
 * Обрабатывает TypeScript файлы и настраивает externals для Node.js окружения
 */
const mainConfig: Configuration = {
  /**
   * Точка входа для main процесса
   * Загружает главный файл приложения
   */
  entry: './src/main.ts',

  /**
   * Настройка модулей для обработки TypeScript и других файлов
   */
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            /**
             * transpileOnly: true ускоряет сборку в development режиме
             * Проверка типов выполняется отдельно через tsc
             */
            transpileOnly: true,
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
    ],
  },

  /**
   * Настройка разрешения модулей
   * Поддерживает TypeScript и JavaScript файлы
   */
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },

  /**
   * Настройка externals для исключения Node.js модулей из bundle
   * Необходимо для корректной работы с Electron API
   */
  externals: {
    electron: 'commonjs electron',
    fs: 'commonjs fs',
    path: 'commonjs path',
    worker_threads: 'commonjs worker_threads',
  },

  /**
   * Настройка devtool для source maps в development режиме
   * Помогает в отладке TypeScript кода
   */
  devtool: process.env['NODE_ENV'] === 'development' ? 'source-map' : false,

  /**
   * Настройка режима сборки
   * Определяется переменной окружения NODE_ENV
   */
  mode:
    process.env['NODE_ENV'] === 'development' ? 'development' : 'production',
};

/**
 * Webpack конфигурация для preload скрипта
 * Обрабатывает preload.ts файл для безопасного взаимодействия с main процессом
 */
const preloadConfig: Configuration = {
  entry: './src/preload.ts',

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },

  externals: {
    electron: 'commonjs electron',
  },

  devtool: process.env['NODE_ENV'] === 'development' ? 'source-map' : false,
  mode:
    process.env['NODE_ENV'] === 'development' ? 'development' : 'production',
};

/**
 * Основная конфигурация Electron Forge
 * Настраивает сборку, упаковку и плагины для приложения
 */
const config: ForgeConfig = {
  /**
   * Конфигурация упаковщика
   * asar: true создает архив для защиты исходного кода
   */
  packagerConfig: {
    asar: true,
    icon: path.join(__dirname, 'icons', 'icon'),
  },

  /**
   * Конфигурация пересборки нативных модулей
   * Пустой объект означает использование настроек по умолчанию
   */
  rebuildConfig: {},

  /**
   * Настройка makers для создания установочных пакетов
   * Поддерживает Windows, macOS, Linux (Debian, RPM)
   */
  makers: [
    new MakerSquirrel({
      iconUrl:
        'https://raw.githubusercontent.com/electron/electron/master/style/logo.ico',
      setupIcon: path.join(__dirname, 'icons', 'icon.ico'),
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({}),
    new MakerRpm({}),
  ],

  /**
   * Настройка плагинов для расширения функциональности
   */
  plugins: [
    /**
     * Плагин для автоматической распаковки нативных модулей
     * Необходим для корректной работы с native dependencies
     */
    new AutoUnpackNativesPlugin({}),

    /**
     * Webpack плагин для сборки TypeScript кода
     * Настраивает main и preload процессы
     */
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: preloadConfig,
        entryPoints: [
          {
            /**
             * Точка входа для preload скрипта
             * Обеспечивает безопасное взаимодействие между процессами
             * Имя 'main_window' соответствует переменной MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
             */
            js: './src/preload.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),

    /**
     * Плагин Fuses для настройки безопасности Electron
     * Отключает потенциально опасные функции
     */
    new FusesPlugin({
      version: FuseVersion.V1,
      /**
       * Отключает запуск как Node.js процесс
       * Повышает безопасность приложения
       */
      [FuseV1Options.RunAsNode]: false,

      /**
       * Включает шифрование cookies
       * Защищает пользовательские данные
       */
      [FuseV1Options.EnableCookieEncryption]: true,

      /**
       * Отключает переменную окружения NODE_OPTIONS
       * Предотвращает потенциальные атаки через переменные окружения
       */
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,

      /**
       * Отключает аргументы инспекции Node.js CLI
       * Защищает от отладки в production
       */
      [FuseV1Options.EnableNodeCliInspectArguments]: false,

      /**
       * Включает проверку целостности встроенного asar архива
       * Защищает от модификации приложения
       */
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,

      /**
       * Загружает приложение только из asar архива
       * Повышает безопасность и производительность
       */
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
