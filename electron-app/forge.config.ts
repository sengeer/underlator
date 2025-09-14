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

/**
 * Webpack конфигурация для main процесса Electron
 *
 * @description Настраивает сборку TypeScript файлов для Electron main процесса
 * с поддержкой Node.js окружения и исключением Electron API из bundle.
 *
 * Документация: https://webpack.js.org/configuration/
 */
const mainConfig: Configuration = {
  /**
   * Точка входа для main процесса Electron
   *
   * @description Указывает главный файл приложения, который будет запущен
   * в main процессе Electron. Должен содержать создание BrowserWindow
   * и настройку IPC handlers.
   *
   * Обоснование: Electron требует точку входа для main процесса,
   * которая инициализирует приложение и создает окна.
   *
   * Документация: https://webpack.js.org/configuration/entry-context/#entry
   */
  entry: './src/main.ts',

  /**
   * Настройка модулей для обработки различных типов файлов
   *
   * @description Определяет правила обработки файлов в процессе сборки.
   * Использует ts-loader для TypeScript файлов и поддерживает JavaScript.
   *
   * Обоснование: Electron приложения используют TypeScript для main процесса,
   * поэтому необходим loader для транспиляции TS в JS.
   *
   * Документация: https://webpack.js.org/configuration/module/
   */
  module: {
    rules: [
      {
        /**
         * Правило для обработки TypeScript файлов
         *
         * @description Использует ts-loader для транспиляции .ts файлов в JavaScript.
         * Исключает node_modules для ускорения сборки.
         *
         * Обоснование: TypeScript файлы должны быть транспилированы в JavaScript
         * для выполнения в Node.js окружении Electron.
         *
         * Документация: https://github.com/TypeStrong/ts-loader
         */
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            /**
             * Ускоряет сборку в development режиме
             *
             * @description Отключает проверку типов во время сборки,
             * позволяя TypeScript компилятору работать быстрее.
             * Проверка типов выполняется отдельно через tsc или IDE.
             *
             * Обоснование: В development режиме важна скорость сборки,
             * а проверка типов может выполняться асинхронно.
             *
             * Документация: https://github.com/TypeStrong/ts-loader#transpileonly
             */
            transpileOnly: true,

            /**
             * Путь к tsconfig.json
             *
             * @description Указывает путь к файлу конфигурации TypeScript.
             * Необходимо для корректной работы ts-loader с настройками проекта.
             *
             * Обоснование: ts-loader должен знать о настройках TypeScript
             * проекта для правильной транспиляции.
             *
             * Документация: https://github.com/TypeStrong/ts-loader#configfile
             */
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      },
      {
        /**
         * Правило для обработки JavaScript файлов
         *
         * @description Обрабатывает .js файлы через ts-loader для совместимости
         * с TypeScript проектом и единообразной обработки.
         *
         * Обоснование: В TypeScript проекте могут быть JavaScript файлы,
         * которые должны обрабатываться единообразно.
         *
         * Документация: https://github.com/TypeStrong/ts-loader#allowjs
         */
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
   *
   * @description Определяет как Webpack разрешает модули и их расширения.
   * Поддерживает TypeScript, JavaScript и JSON файлы.
   *
   * Обоснование: Electron приложения используют различные типы файлов,
   * поэтому необходимо указать поддерживаемые расширения.
   *
   * Документация: https://webpack.js.org/configuration/resolve/
   */
  resolve: {
    /**
     * Массив расширений файлов для автоматического разрешения
     *
     * @description Webpack будет искать файлы с указанными расширениями
     * при импорте модулей без указания расширения.
     *
     * Обоснование: Позволяет импортировать модули без указания расширения,
     * что упрощает код и соответствует стандартам TypeScript/JavaScript.
     *
     * Документация: https://webpack.js.org/configuration/resolve/#resolveextensions
     */
    extensions: ['.ts', '.js', '.json'],

    /**
     * Алиасы для путей модулей
     *
     * @description Создает короткие пути для импорта модулей,
     * упрощая структуру импортов в коде.
     *
     * Обоснование: Алиасы упрощают импорты и делают код более читаемым,
     * особенно в больших проектах с глубокой структурой папок.
     *
     * Документация: https://webpack.js.org/configuration/resolve/#resolvealias
     */
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },

  /**
   * Настройка externals для исключения модулей из bundle
   *
   * @description Исключает указанные модули из сборки, оставляя их
   * как внешние зависимости. Необходимо для корректной работы с Electron API.
   *
   * Обоснование: Electron API и Node.js модули должны быть доступны
   * во время выполнения, а не включаться в bundle.
   *
   * Документация: https://webpack.js.org/configuration/externals/
   */
  externals: {
    /**
     * Исключает Electron API из bundle
     *
     * @description Electron API должен быть доступен во время выполнения,
     * поэтому исключается из сборки.
     *
     * Обоснование: Electron предоставляет API через глобальные объекты,
     * которые должны быть доступны в runtime, а не в bundle.
     */
    electron: 'commonjs electron',

    /**
     * Исключает Node.js файловую систему из bundle
     *
     * @description Node.js модуль fs должен быть доступен во время выполнения
     * для работы с файловой системой.
     *
     * Обоснование: Electron main процесс работает в Node.js окружении,
     * где fs доступен глобально.
     */
    fs: 'commonjs fs',

    /**
     * Исключает Node.js модуль path из bundle
     *
     * @description Node.js модуль path для работы с путями файлов
     * должен быть доступен во время выполнения.
     *
     * Обоснование: path - стандартный Node.js модуль, доступный глобально.
     */
    path: 'commonjs path',

    /**
     * Исключает Node.js worker threads из bundle
     *
     * @description Node.js модуль для работы с worker threads
     * должен быть доступен во время выполнения.
     *
     * Обоснование: worker_threads - стандартный Node.js модуль,
     * необходимый для многопоточности в Electron.
     */
    worker_threads: 'commonjs worker_threads',
  },

  /**
   * Настройка devtool для source maps
   *
   * @description Включает source maps в development режиме для отладки
   * TypeScript кода. Отключает в production для оптимизации размера.
   *
   * Обоснование: Source maps необходимы для отладки TypeScript кода,
   * но увеличивают размер bundle в production.
   *
   * Документация: https://webpack.js.org/configuration/devtool/
   */
  devtool: process.env['NODE_ENV'] === 'development' ? 'source-map' : false,

  /**
   * Настройка режима сборки
   *
   * @description Определяет режим сборки на основе переменной окружения NODE_ENV.
   * Development режим включает отладочную информацию, production оптимизирует код.
   *
   * Обоснование: Разные режимы требуют разных оптимизаций:
   * development - скорость сборки и отладка,
   * production - размер и производительность.
   *
   * Документация: https://webpack.js.org/configuration/mode/
   */
  mode:
    process.env['NODE_ENV'] === 'development' ? 'development' : 'production',
};

/**
 * Webpack конфигурация для preload скрипта Electron
 *
 * @description Настраивает сборку preload.ts файла для безопасного взаимодействия
 * между renderer и main процессами Electron. Preload скрипт выполняется
 * в контексте renderer процесса, но имеет доступ к Node.js API.
 *
 * Документация: https://webpack.js.org/configuration/
 */
const preloadConfig: Configuration = {
  /**
   * Точка входа для preload скрипта
   *
   * @description Указывает файл preload.ts, который будет выполнен
   * в контексте renderer процесса перед загрузкой веб-страницы.
   *
   * Обоснование: Preload скрипт необходим для безопасного
   * взаимодействия между renderer и main процессами.
   *
   * Документация: https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
   */
  entry: './src/preload.ts',

  /**
   * Настройка модулей для обработки TypeScript файлов
   *
   * @description Определяет правила обработки файлов в процессе сборки.
   * Использует ts-loader для TypeScript файлов.
   *
   * Обоснование: Preload скрипт написан на TypeScript и должен быть
   * транспилирован в JavaScript для выполнения в Electron.
   *
   * Документация: https://webpack.js.org/configuration/module/
   */
  module: {
    rules: [
      {
        /**
         * Правило для обработки TypeScript файлов в preload
         *
         * @description Использует ts-loader для транспиляции .ts файлов в JavaScript.
         * Исключает node_modules для ускорения сборки.
         *
         * Обоснование: TypeScript файлы должны быть транспилированы в JavaScript
         * для выполнения в контексте renderer процесса.
         *
         * Документация: https://github.com/TypeStrong/ts-loader
         */
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            /**
             * Ускоряет сборку в development режиме
             *
             * @description Отключает проверку типов во время сборки,
             * позволяя TypeScript компилятору работать быстрее.
             * Проверка типов выполняется отдельно через tsc или IDE.
             *
             * Обоснование: В development режиме важна скорость сборки,
             * а проверка типов может выполняться асинхронно.
             *
             * Документация: https://github.com/TypeStrong/ts-loader#transpileonly
             */
            transpileOnly: true,

            /**
             * Путь к tsconfig.json
             *
             * @description Указывает путь к файлу конфигурации TypeScript.
             * Необходимо для корректной работы ts-loader с настройками проекта.
             *
             * Обоснование: ts-loader должен знать о настройках TypeScript
             * проекта для правильной транспиляции.
             *
             * Документация: https://github.com/TypeStrong/ts-loader#configfile
             */
            configFile: path.resolve(__dirname, 'tsconfig.json'),
          },
        },
      },
    ],
  },

  /**
   * Настройка разрешения модулей для preload
   *
   * @description Определяет как Webpack разрешает модули и их расширения.
   * Поддерживает TypeScript, JavaScript и JSON файлы.
   *
   * Обоснование: Preload скрипт может использовать различные типы файлов,
   * поэтому необходимо указать поддерживаемые расширения.
   *
   * Документация: https://webpack.js.org/configuration/resolve/
   */
  resolve: {
    /**
     * Массив расширений файлов для автоматического разрешения
     *
     * @description Webpack будет искать файлы с указанными расширениями
     * при импорте модулей без указания расширения.
     *
     * Обоснование: Позволяет импортировать модули без указания расширения,
     * что упрощает код и соответствует стандартам TypeScript/JavaScript.
     *
     * Документация: https://webpack.js.org/configuration/resolve/#resolveextensions
     */
    extensions: ['.ts', '.js', '.json'],

    /**
     * Алиасы для путей модулей в preload
     *
     * @description Создает короткие пути для импорта модулей,
     * упрощая структуру импортов в preload скрипте.
     *
     * Обоснование: Алиасы упрощают импорты и делают код более читаемым,
     * особенно в больших проектах с глубокой структурой папок.
     *
     * Документация: https://webpack.js.org/configuration/resolve/#resolvealias
     */
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },

  /**
   * Настройка externals для preload скрипта
   *
   * @description Исключает указанные модули из сборки, оставляя их
   * как внешние зависимости. Необходимо для корректной работы с Electron API.
   *
   * Обоснование: Electron API должен быть доступен во время выполнения,
   * а не включаться в bundle preload скрипта.
   *
   * Документация: https://webpack.js.org/configuration/externals/
   */
  externals: {
    /**
     * Исключает Electron API из bundle preload
     *
     * @description Electron API должен быть доступен во время выполнения
     * в контексте preload скрипта, поэтому исключается из сборки.
     *
     * Обоснование: Electron предоставляет API через глобальные объекты,
     * которые должны быть доступны в runtime, а не в bundle.
     */
    electron: 'commonjs electron',
  },

  /**
   * Настройка devtool для source maps в preload
   *
   * @description Включает source maps в development режиме для отладки
   * TypeScript кода в preload скрипте. Отключает в production для оптимизации размера.
   *
   * Обоснование: Source maps необходимы для отладки TypeScript кода,
   * но увеличивают размер bundle в production.
   *
   * Документация: https://webpack.js.org/configuration/devtool/
   */
  devtool: process.env['NODE_ENV'] === 'development' ? 'source-map' : false,

  /**
   * Настройка режима сборки для preload
   *
   * @description Определяет режим сборки на основе переменной окружения NODE_ENV.
   * Development режим включает отладочную информацию, production оптимизирует код.
   *
   * Обоснование: Разные режимы требуют разных оптимизаций:
   * development - скорость сборки и отладка,
   * production - размер и производительность.
   *
   * Документация: https://webpack.js.org/configuration/mode/
   */
  mode:
    process.env['NODE_ENV'] === 'development' ? 'development' : 'production',
};

/**
 * Основная конфигурация Electron Forge
 *
 * @description Настраивает сборку, упаковку и плагины для Electron приложения.
 * Electron Forge - это инструмент для создания, сборки и распространения
 * Electron приложений с минимальной конфигурацией.
 *
 * Документация: https://www.electronforge.io/
 */
const config: ForgeConfig = {
  /**
   * Конфигурация упаковщика Electron
   *
   * @description Настраивает параметры упаковки приложения в исполняемый файл.
   * Использует electron-packager для создания дистрибутивов.
   *
   * Обоснование: Electron приложения должны быть упакованы в исполняемые файлы
   * для распространения среди пользователей.
   *
   * Документация: https://www.electronforge.io/config/forge#packagerconfig
   */
  packagerConfig: {
    /**
     * Создание архива для защиты исходного кода
     *
     * @description Создает asar архив, который содержит исходный код приложения
     * в зашифрованном виде. Защищает код от простого извлечения и ускоряет загрузку.
     *
     * Обоснование: asar архивы защищают интеллектуальную собственность
     * и улучшают производительность загрузки приложения.
     *
     * Документация: https://www.electronjs.org/docs/latest/tutorial/application-packaging#asar-archives
     */
    asar: true,

    /**
     * Путь к иконке приложения
     *
     * @description Указывает путь к иконке приложения для различных платформ.
     * Electron автоматически выберет правильный формат иконки для каждой ОС.
     *
     * Обоснование: Иконка необходима для идентификации приложения
     * в файловой системе и панели задач.
     *
     * Документация: https://www.electronjs.org/docs/latest/tutorial/application-packaging#icons
     */
    icon: path.join(__dirname, 'icons', 'icon'),
  },

  /**
   * Конфигурация пересборки нативных модулей
   *
   * @description Настраивает параметры пересборки нативных модулей Node.js
   * для совместимости с версией Electron. Пустой объект означает использование
   * настроек по умолчанию.
   *
   * Обоснование: Нативные модули должны быть пересобраны для совместимости
   * с версией Electron, так как Electron использует собственную версию Node.js.
   *
   * Документация: https://www.electronforge.io/config/forge#rebuildconfig
   */
  rebuildConfig: {},

  /**
   * Настройка makers для создания установочных пакетов
   *
   * @description Определяет какие типы установочных пакетов создавать
   * для различных платформ. Поддерживает Windows, macOS, Linux (Debian, RPM).
   *
   * Обоснование: Разные платформы требуют разных форматов установочных пакетов
   * для корректной установки и интеграции с операционной системой.
   *
   * Документация: https://www.electronforge.io/config/makers
   */
  makers: [
    /**
     * Создаёт MakerSquirrel для Windows
     *
     * @description Создает установочный пакет для Windows в формате Squirrel.
     * Squirrel обеспечивает автоматические обновления и простую установку.
     *
     * Обоснование: Squirrel - стандартный формат установочных пакетов
     * для Windows приложений с поддержкой автообновлений.
     *
     * Документация: https://www.electronforge.io/config/makers/squirrel.windows
     */
    new MakerSquirrel({
      /**
       * Адрес URL иконки для Windows
       *
       * @description Указывает URL иконки для отображения в установщике Windows.
       * Используется GitHub URL для стандартной иконки Electron.
       *
       * Обоснование: Windows требует URL иконки для корректного отображения
       * в установщике и панели управления.
       */
      iconUrl:
        'https://raw.githubusercontent.com/electron/electron/master/style/logo.ico',

      /**
       * Путь к иконке установщика
       *
       * @description Указывает путь к иконке, которая будет использоваться
       * в установщике Windows.
       *
       * Обоснование: Иконка установщика помогает пользователям
       * идентифицировать приложение во время установки.
       */
      setupIcon: path.join(__dirname, 'icons', 'icon.ico'),
    }),

    /**
     * Создаёт MakerZIP для macOS
     *
     * @description Создает ZIP архив для macOS приложения.
     * Пользователи могут распаковать и запустить приложение.
     *
     * Обоснование: ZIP - простой способ распространения macOS приложений
     * без необходимости создания DMG или PKG пакетов.
     *
     * Документация: https://www.electronforge.io/config/makers/zip
     */
    new MakerZIP({}, ['darwin']),

    /**
     * MakerDeb для Debian/Ubuntu Linux
     *
     * @description Создает DEB пакет для Debian-совместимых дистрибутивов Linux.
     * Обеспечивает интеграцию с системой управления пакетами.
     *
     * Обоснование: DEB - стандартный формат пакетов для Debian/Ubuntu,
     * обеспечивающий корректную установку и управление зависимостями.
     *
     * Документация: https://www.electronforge.io/config/makers/deb
     */
    new MakerDeb({}),

    /**
     * MakerRpm для Red Hat/Fedora Linux
     *
     * @description Создает RPM пакет для Red Hat-совместимых дистрибутивов Linux.
     * Обеспечивает интеграцию с системой управления пакетами.
     *
     * Обоснование: RPM - стандартный формат пакетов для Red Hat/Fedora,
     * обеспечивающий корректную установку и управление зависимостями.
     *
     * Документация: https://www.electronforge.io/config/makers/rpm
     */
    new MakerRpm({}),
  ],

  /**
   * Настройка плагинов для расширения функциональности
   *
   * @description Определяет плагины, которые расширяют возможности
   * Electron Forge. Включает автоматическую распаковку нативных модулей,
   * Webpack интеграцию и настройки безопасности.
   *
   * Обоснование: Плагины обеспечивают необходимую функциональность
   * для сборки, безопасности и оптимизации приложения.
   *
   * Документация: https://www.electronforge.io/config/plugins
   */
  plugins: [
    /**
     * Плагин для автоматической распаковки нативных модулей
     *
     * @description Автоматически распаковывает нативные модули Node.js
     * для корректной работы с Electron. Необходим для модулей,
     * которые содержат бинарные файлы.
     *
     * Обоснование: Нативные модули должны быть распакованы из asar архива
     * для корректной работы в Electron окружении.
     *
     * Документация: https://www.electronforge.io/config/plugins/auto-unpack-natives
     */
    new AutoUnpackNativesPlugin({}),

    /**
     * Плагин Webpack для сборки TypeScript кода
     *
     * @description Интегрирует Webpack с Electron Forge для сборки
     * TypeScript кода в main и preload процессах. Обеспечивает
     * горячую перезагрузку в development режиме.
     *
     * Обоснование: Webpack необходим для транспиляции TypeScript
     * и оптимизации сборки приложения.
     *
     * Документация: https://www.electronforge.io/config/plugins/webpack
     */
    new WebpackPlugin({
      /**
       * Конфигурация Webpack для main процесса
       *
       * @description Указывает конфигурацию Webpack для сборки
       * main процесса Electron.
       *
       * Обоснование: Main процесс требует отдельной конфигурации
       * для корректной работы с Node.js API.
       */
      mainConfig,

      /**
       * Конфигурация для renderer процесса
       *
       * @description Настраивает сборку renderer процесса и preload скриптов.
       * Определяет точки входа для различных окон приложения.
       *
       * Обоснование: Renderer процесс требует отдельной конфигурации
       * для работы с веб-технологиями и preload скриптами.
       */
      renderer: {
        /**
         * Конфигурация Webpack для preload скрипта
         *
         * @description Указывает конфигурацию Webpack для сборки
         * preload скрипта.
         *
         * Обоснование: Preload скрипт требует отдельной конфигурации
         * для безопасного взаимодействия с main процессом.
         */
        config: preloadConfig,

        /**
         * Точки входа для renderer процесса
         *
         * @description Определяет точки входа для различных окон
         * приложения и их preload скриптов.
         *
         * Обоснование: Каждое окно приложения может иметь свой
         * HTML файл и preload скрипт.
         */
        entryPoints: [
          {
            /**
             * Точка входа для preload скрипта
             *
             * @description Указывает файл preload скрипта, который будет
             * выполнен в контексте renderer процесса.
             *
             * Обоснование: Preload скрипт необходим для безопасного
             * взаимодействия между процессами.
             */
            js: './src/preload.ts',

            /**
             * Имя окна для идентификации
             *
             * @description Уникальное имя окна, которое используется
             * для идентификации в Webpack и Electron.
             *
             * Обоснование: Имя окна используется для генерации
             * переменных окружения Webpack (MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY).
             */
            name: 'main_window',

            /**
             * Конфигурация preload скрипта
             *
             * @description Определяет параметры preload скрипта,
             * включая путь к файлу и настройки безопасности.
             *
             * Обоснование: Preload скрипт требует специальной конфигурации
             * для корректной работы с Electron API.
             */
            preload: {
              /**
               * Путь к preload скрипту
               *
               * @description Указывает путь к файлу preload скрипта.
               *
               * Обоснование: Preload скрипт должен быть указан явно
               * для корректной загрузки в renderer процесс.
               */
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),

    /**
     * Плагин Fuses для настройки безопасности Electron
     *
     * @description Настраивает флаги безопасности Electron для защиты
     * приложения от потенциальных уязвимостей. Отключает опасные функции
     * и включает дополнительные проверки безопасности.
     *
     * Обоснование: Безопасность критически важна для десктопных приложений,
     * особенно при работе с чувствительными данными.
     *
     * Документация: https://www.electronforge.io/config/plugins/fuses
     */
    new FusesPlugin({
      /**
       * Версия Fuses API
       *
       * @description Указывает версию Fuses API для совместимости
       * с версией Electron.
       *
       * Обоснование: Разные версии Electron поддерживают разные
       * версии Fuses API.
       *
       * Документация: https://www.electronjs.org/docs/latest/tutorial/fuses
       */
      version: FuseVersion.V1,

      /**
       * Отключает запуск как Node.js процесс
       *
       * @description Предотвращает запуск приложения как обычного
       * Node.js процесса, что повышает безопасность.
       *
       * Обоснование: Electron приложения должны запускаться только
       * через Electron runtime, а не как обычные Node.js процессы.
       *
       * Документация: https://www.electronjs.org/docs/latest/tutorial/fuses#runasnode-false
       */
      [FuseV1Options.RunAsNode]: false,

      /**
       * Включает шифрование cookies
       *
       * @description Включает автоматическое шифрование cookies
       * для защиты пользовательских данных.
       *
       * Обоснование: Cookies могут содержать чувствительную информацию,
       * которая должна быть защищена от несанкционированного доступа.
       *
       * Документация: https://www.electronjs.org/docs/latest/tutorial/fuses#enablecookieencryption-true
       */
      [FuseV1Options.EnableCookieEncryption]: true,

      /**
       * Отключает NODE_OPTIONS
       *
       * @description Отключает переменную окружения NODE_OPTIONS,
       * которая может быть использована для атак.
       *
       * Обоснование: NODE_OPTIONS может быть использована злоумышленниками
       * для выполнения произвольного кода в приложении.
       *
       * Документация: https://www.electronjs.org/docs/latest/tutorial/fuses#enablenodeoptionsenvironmentvariable-false
       */
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,

      /**
       * Отключает аргументы инспекции
       *
       * @description Отключает аргументы командной строки для инспекции
       * Node.js процесса, что предотвращает отладку в production.
       *
       * Обоснование: Аргументы инспекции могут быть использованы
       * для отладки и анализа приложения в production.
       *
       * Документация: https://www.electronjs.org/docs/latest/tutorial/fuses#enablenodecliinspectarguments-false
       */
      [FuseV1Options.EnableNodeCliInspectArguments]: false,

      /**
       * Включает проверку целостности
       *
       * @description Включает проверку целостности встроенного asar архива
       * для защиты от модификации приложения.
       *
       * Обоснование: Проверка целостности предотвращает модификацию
       * приложения злоумышленниками.
       *
       * Документация: https://www.electronjs.org/docs/latest/tutorial/fuses#enableembeddedasarintegrityvalidation-true
       */
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,

      /**
       * Загружает приложение только из asar
       *
       * @description Заставляет Electron загружать приложение только
       * из asar архива, а не из файловой системы.
       *
       * Обоснование: Загрузка только из asar архива повышает безопасность
       * и производительность приложения.
       *
       * Документация: https://www.electronjs.org/docs/latest/tutorial/fuses#onlyloadappfromasar-true
       */
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
