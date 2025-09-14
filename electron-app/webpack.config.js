const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

/**
 * Webpack конфигурация для Electron backend
 *
 * @description Настраивает сборку TypeScript файлов для Electron main процесса
 * с поддержкой Node.js окружения и оптимизацией для production.
 *
 * Документация: https://webpack.js.org/configuration/
 */
module.exports = {
  /**
   * Целевая платформа для сборки
   *
   * @description Указывает целевую платформу для webpack сборки.
   * node означает, что код будет выполняться в Node.js окружении.
   *
   * Обоснование: Electron main процесс работает в Node.js окружении,
   * поэтому target должен быть установлен в 'node'.
   *
   * Документация: https://webpack.js.org/configuration/target/
   */
  target: 'node',

  /**
   * Режим сборки
   *
   * @description Определяет режим сборки webpack.
   * production включает оптимизации для уменьшения размера файлов.
   *
   * Обоснование: Production режим оптимизирует код для production
   * использования, уменьшая размер bundle и улучшая производительность.
   *
   * Документация: https://webpack.js.org/configuration/mode/
   */
  mode: 'production',

  /**
   * Точки входа для сборки
   *
   * @description Определяет точки входа для webpack сборки.
   * Каждый ключ создает отдельный bundle файл.
   *
   * Обоснование: Electron приложения требуют отдельные точки входа
   * для main процесса, preload скрипта и worker процессов.
   *
   * Документация: https://webpack.js.org/configuration/entry-context/#entry
   */
  entry: {
    /**
     * Точка входа для main процесса Electron
     *
     * @description Главный файл приложения, который создает BrowserWindow
     * и настраивает IPC handlers.
     *
     * Обоснование: Main процесс - это точка входа Electron приложения,
     * которая инициализирует приложение и создает окна.
     */
    main: './src/main.ts',

    /**
     * Точка входа для preload скрипта
     *
     * @description Preload скрипт для безопасного взаимодействия
     * между renderer и main процессами.
     *
     * Обоснование: Preload скрипт необходим для безопасного
     * взаимодействия между процессами Electron.
     */
    preload: './src/preload.ts',

    /**
     * Точка входа для worker процесса
     *
     * @description Worker процесс для выполнения тяжелых вычислений
     * в отдельном потоке.
     *
     * Обоснование: Worker процессы позволяют выполнять тяжелые операции
     * без блокировки основного потока приложения.
     */
    worker: './src/worker.js',
  },

  /**
   * Настройки выходных файлов
   *
   * @description Определяет где и как создавать выходные файлы
   * webpack сборки.
   *
   * Обоснование: Настройки output определяют структуру
   * и формат выходных файлов для Electron.
   *
   * Документация: https://webpack.js.org/configuration/output/
   */
  output: {
    /**
     * Директория для выходных файлов
     *
     * @description Указывает абсолютный путь к директории,
     * где будут созданы выходные файлы.
     *
     * Обоснование: Отдельная директория для выходных файлов
     * упрощает сборку и предотвращает конфликты с исходным кодом.
     *
     * Документация: https://webpack.js.org/configuration/output/#outputpath
     */
    path: path.resolve(__dirname, 'dist/electron'),

    /**
     * Шаблон имени выходных файлов
     *
     * @description Определяет шаблон имени для выходных файлов.
     * [name] заменяется на ключ из entry объекта.
     *
     * Обоснование: Динамические имена файлов позволяют создавать
     * отдельные файлы для каждой точки входа.
     *
     * Документация: https://webpack.js.org/configuration/output/#outputfilename
     */
    filename: '[name].js',

    /**
     * Формат экспорта библиотеки
     *
     * @description Определяет формат экспорта для библиотеки.
     * commonjs2 совместим с Node.js модульной системой.
     *
     * Обоснование: commonjs2 формат обеспечивает совместимость
     * с Node.js и Electron модульной системой.
     *
     * Документация: https://webpack.js.org/configuration/output/#outputlibrarytarget
     */
    libraryTarget: 'commonjs2',
  },

  /**
   * Модули для исключения из bundle
   *
   * @description Определяет модули, которые не должны включаться
   * в bundle, а должны быть доступны во время выполнения.
   *
   * Обоснование: Node.js модули и Electron API должны быть доступны
   * во время выполнения, а не включаться в bundle.
   *
   * Документация: https://webpack.js.org/configuration/externals/
   */
  externals: [
    /**
     * Автоматическое исключение Node.js модулей
     *
     * @description Автоматически исключает все модули из node_modules,
     * кроме указанных в allowlist.
     *
     * Обоснование: Большинство Node.js модулей не должны включаться
     * в bundle, так как они доступны в runtime.
     *
     * Документация: https://github.com/liady/webpack-node-externals
     */
    nodeExternals({
      /**
       * Модули для включения в bundle
       *
       * @description Список модулей, которые должны быть включены
       * в bundle, несмотря на то, что они находятся в node_modules.
       *
       * Обоснование: webpack/hot/poll необходим для hot reload
       * в development режиме.
       */
      allowlist: ['webpack/hot/poll?100'],

      /**
       * Директории с модулями
       *
       * @description Указывает директории, которые содержат модули
       * для исключения из bundle.
       *
       * Обоснование: node_modules - стандартная директория
       * для Node.js модулей.
       */
      modulesDirs: ['node_modules'],
    }),

    /**
     * Ручное исключение критических модулей
     *
     * @description Явно исключает критические модули Node.js
     * и Electron API из bundle.
     *
     * Обоснование: Эти модули должны быть доступны во время выполнения
     * и не должны включаться в bundle.
     */
    {
      /**
       * Исключает Electron API из bundle
       *
       * @description Electron API должен быть доступен во время выполнения,
       * поэтому исключается из сборки.
       *
       * Обоснование: Electron предоставляет API через глобальные объекты,
       * которые должны быть доступны в runtime.
       */
      electron: 'commonjs electron',

      /**
       * Исключает Node.js файловую систему из bundle
       *
       * @description Node.js модуль fs должен быть доступен во время выполнения
       * для работы с файловой системой.
       *
       * Обоснование: fs - стандартный Node.js модуль, доступный глобально.
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
  ],

  /**
   * Настройки разрешения модулей
   *
   * @description Определяет как webpack разрешает модули и их расширения.
   * Поддерживает TypeScript, JavaScript и JSON файлы.
   *
   * Обоснование: Electron приложения используют различные типы файлов,
   * поэтому необходимо указать поддерживаемые расширения и алиасы.
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
   * Настройки обработки модулей
   *
   * @description Определяет правила обработки различных типов файлов
   * в процессе сборки webpack.
   *
   * Обоснование: Electron приложения используют TypeScript файлы,
   * которые должны быть транспилированы в JavaScript.
   *
   * Документация: https://webpack.js.org/configuration/module/
   */
  module: {
    /**
     * Правила обработки файлов
     *
     * @description Массив правил, которые определяют как обрабатывать
     * различные типы файлов в процессе сборки.
     *
     * Обоснование: Разные типы файлов требуют разных обработчиков
     * для корректной сборки.
     *
     * Документация: https://webpack.js.org/configuration/module/#modulerules
     */
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
        use: {
          loader: 'ts-loader',
          options: {
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

            /**
             * Отключает проверку типов во время сборки
             *
             * @description Отключает проверку типов во время сборки,
             * позволяя TypeScript компилятору работать быстрее.
             * Проверка типов выполняется отдельно через tsc.
             *
             * Обоснование: В production режиме важна скорость сборки,
             * а проверка типов может выполняться отдельно.
             *
             * Документация: https://github.com/TypeStrong/ts-loader#transpileonly
             */
            transpileOnly: false,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },

  /**
   * Настройки оптимизации сборки
   *
   * @description Определяет оптимизации для webpack сборки,
   * включая минификацию и разделение кода.
   *
   * Обоснование: Оптимизации улучшают производительность
   * и уменьшают размер выходных файлов.
   *
   * Документация: https://webpack.js.org/configuration/optimization/
   */
  optimization: {
    /**
     * Включает минификацию кода
     *
     * @description Включает минификацию JavaScript кода
     * для уменьшения размера файлов.
     *
     * Обоснование: Минификация уменьшает размер файлов
     * и улучшает производительность загрузки.
     *
     * Документация: https://webpack.js.org/configuration/optimization/#optimizationminimize
     */
    minimize: true,

    /**
     * Настройки минификатора
     *
     * @description Определяет какие минификаторы использовать
     * для оптимизации кода.
     *
     * Обоснование: TerserPlugin обеспечивает эффективную минификацию
     * JavaScript кода с сохранением функциональности.
     *
     * Документация: https://webpack.js.org/configuration/optimization/#optimizationminimizer
     */
    minimizer: [
      new TerserPlugin({
        /**
         * Опции для Terser минификатора
         *
         * @description Настраивает параметры Terser минификатора
         * для оптимизации JavaScript кода.
         *
         * Обоснование: Настройки Terser обеспечивают баланс
         * между минификацией и сохранением функциональности.
         *
         * Документация: https://github.com/webpack-contrib/terser-webpack-plugin
         */
        terserOptions: {
          /**
           * Сохраняет имена классов
           *
           * @description Сохраняет оригинальные имена классов
           * в минифицированном коде.
           *
           * Обоснование: Сохранение имен классов необходимо
           * для корректной работы с Electron API и декораторами.
           */
          keep_classnames: true,

          /**
           * Сохраняет имена функций
           *
           * @description Сохраняет оригинальные имена функций
           * в минифицированном коде.
           *
           * Обоснование: Сохранение имен функций необходимо
           * для корректной работы с Electron API и отладки.
           */
          keep_fnames: true,
        },
      }),
    ],
  },

  /**
   * Настройки source maps
   *
   * @description Определяет как генерировать source maps
   * для связи скомпилированного кода с исходным.
   *
   * Обоснование: Source maps необходимы для отладки TypeScript кода,
   * но отключены в production для уменьшения размера файлов.
   *
   * Документация: https://webpack.js.org/configuration/devtool/
   */
  devtool: false,
};
