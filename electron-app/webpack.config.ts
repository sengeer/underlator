import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';

/**
 * Webpack конфигурация для создания минифицированных файлов в dist/electron
 *
 * @description Настраивает сборку TypeScript файлов с минификацией
 * и выводом результата в папку dist/electron для корректной работы приложения.
 *
 * Документация: https://webpack.js.org/configuration/
 */

export default (argv: { mode: string }) => {
  /**
   * Определение режима сборки
   *
   * @description Определяет режим сборки на основе переменной окружения NODE_ENV
   * или аргумента командной строки --mode. Поддерживает как development, так и production режимы.
   *
   * Обоснование: Динамическое определение режима позволяет использовать
   * одну конфигурацию для разных сценариев сборки.
   */
  const isProduction =
    process.env['NODE_ENV'] === 'production' || argv.mode === 'production';

  return {
    /**
     * Режим сборки Webpack
     *
     * @description Определяет режим сборки Webpack на основе переменной isProduction.
     * В production режиме включаются оптимизации, в development - отладочная информация.
     *
     * Обоснование: Разные режимы требуют разных настроек:
     * development - скорость сборки и отладка,
     * production - размер и производительность.
     *
     * Документация: https://webpack.js.org/configuration/mode/
     */
    mode: isProduction ? 'production' : 'development',

    /**
     * Точки входа для сборки
     *
     * @description Определяет основные файлы, которые будут собраны в отдельные bundle.
     * main - главный процесс Electron, preload - скрипт для безопасного взаимодействия.
     *
     * Обоснование: Electron требует отдельной сборки для main и preload процессов,
     * так как они выполняются в разных контекстах с разными возможностями.
     *
     * Документация: https://webpack.js.org/configuration/entry-context/#entry
     */
    entry: {
      main: './src/main.ts',
      preload: './src/preload.ts',
    },

    /**
     * Настройка модулей для обработки файлов
     *
     * @description Определяет правила обработки различных типов файлов в процессе сборки.
     * Использует ts-loader для TypeScript и JavaScript файлов.
     *
     * Обоснование: TypeScript файлы должны быть транспилированы в JavaScript
     * для выполнения в Electron окружении. Исключение node_modules ускоряет сборку.
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
               *
               * Обоснование: В development режиме важна скорость сборки,
               * а проверка типов может выполняться асинхронно.
               */
              transpileOnly: true,

              /**
               * Путь к tsconfig.json
               *
               * @description Указывает путь к файлу конфигурации TypeScript.
               *
               * Обоснование: ts-loader должен знать о настройках TypeScript
               * проекта для правильной транспиляции.
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
     * Поддерживает TypeScript, JavaScript и JSON файлы. Создает алиасы для упрощения импортов.
     *
     * Обоснование: Алиасы упрощают импорты и делают код более читаемым,
     * особенно в больших проектах с глубокой структурой папок.
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

      /**
       * Исключает better-sqlite3 из bundle
       *
       * @description better-sqlite3 - нативный модуль, который должен
       * быть исключен из bundle и загружаться как внешняя зависимость.
       *
       * Обоснование: better-sqlite3 использует нативные bindings,
       * которые не должны быть обработаны webpack.
       */
      'better-sqlite3': 'commonjs better-sqlite3',

      /**
       * Исключает pdf-parse из bundle
       *
       * @description pdf-parse - модуль с зависимостями от DOM API,
       * который должен быть исключен из bundle и загружаться как внешняя зависимость.
       *
       * Обоснование: pdf-parse требует специальных polyfills и не должен
       * быть обработан webpack для корректной работы.
       */
      'pdf-parse': 'commonjs pdf-parse',
    },

    /**
     * Настройка плагинов Webpack
     *
     * @description Определяет плагины, которые расширяют функциональность Webpack.
     *
     * Обоснование: Плагины необходимы для различных задач сборки
     * и других операций, которые не могут быть выполнены стандартными loaders.
     *
     * Документация: https://webpack.js.org/configuration/plugins/
     */
    plugins: [],

    /**
     * Настройка оптимизации с минификацией (только в production)
     *
     * @description Включает минификацию кода только в production режиме.
     * Использует TerserPlugin для сжатия и оптимизации JavaScript кода.
     *
     * Обоснование: Минификация уменьшает размер bundle и улучшает производительность,
     * но замедляет сборку, поэтому применяется только в production.
     *
     * Документация: https://webpack.js.org/configuration/optimization/
     */
    optimization: isProduction
      ? {
          /**
           * Включает минификацию кода
           *
           * @description Активирует минификацию для уменьшения размера bundle.
           *
           * Обоснование: Минификация критически важна для production сборки
           * для уменьшения размера файлов и улучшения производительности.
           */
          minimize: true,

          /**
           * Настройка минификаторов
           *
           * @description Определяет плагины для минификации кода.
           * Использует TerserPlugin с настройками для Electron приложений.
           *
           * Обоснование: TerserPlugin - стандартный и эффективный минификатор
           * для JavaScript кода с поддержкой современных возможностей.
           */
          minimizer: [
            new TerserPlugin({
              /**
               * Параллельная обработка для ускорения сборки
               *
               * @description Использует все доступные CPU ядра для минификации.
               *
               * Обоснование: Параллельная обработка значительно ускоряет
               * процесс минификации, особенно для больших проектов.
               */
              parallel: true,

              /**
               * Настройки Terser для минификации
               *
               * @description Конфигурирует поведение Terser для оптимальной минификации
               * с сохранением совместимости с Electron API.
               *
               * Обоснование: Специальные настройки необходимы для корректной работы
               * минифицированного кода в Electron окружении.
               */
              terserOptions: {
                /**
                 * Настройки форматирования вывода
                 *
                 * @description Сохраняет важные комментарии (лицензии, авторские права).
                 *
                 * Обоснование: Лицензионные комментарии должны сохраняться
                 * для соответствия требованиям лицензий используемых библиотек.
                 */
                format: {
                  comments: /@license|@preserve|@copyright/i,
                },

                /**
                 * Настройки сжатия кода
                 *
                 * @description Удаляет console.log, debugger и другие отладочные конструкции.
                 *
                 * Обоснование: Отладочный код не нужен в production сборке
                 * и его удаление уменьшает размер и улучшает производительность.
                 */
                compress: {
                  drop_console: true,
                  drop_debugger: true,
                  pure_funcs: ['console.log', 'console.info', 'console.debug'],
                },

                /**
                 * Настройки переименования переменных
                 *
                 * @description Сохраняет имена важных Electron API от переименования.
                 *
                 * Обоснование: Electron API должны сохранять свои имена
                 * для корректной работы в runtime окружении.
                 */
                mangle: {
                  reserved: [
                    'BrowserWindow',
                    'app',
                    'ipcMain',
                    'ipcRenderer',
                    'contextBridge',
                  ],
                },
              },

              /**
               * Извлечение комментариев в отдельный файл
               *
               * @description Создает файл licenses.txt с лицензионной информацией.
               *
               * Обоснование: Отдельный файл с лицензиями упрощает соответствие
               * требованиям лицензий используемых библиотек.
               */
              extractComments: {
                filename: 'licenses.txt',
                banner: 'Licenses:\n',
              },
            }),
          ],
        }
      : {},

    /**
     * Настройка вывода файлов сборки
     *
     * @description Определяет где и как будут созданы файлы сборки.
     * Выводит файлы в папку dist/electron с очисткой предыдущих сборок.
     *
     * Обоснование: Папка dist/electron используется для production сборки,
     * которая затем копируется в .webpack для совместимости с Electron Forge.
     *
     * Документация: https://webpack.js.org/configuration/output/
     */
    output: {
      /**
       * Путь для выходных файлов
       *
       * @description Указывает директорию, в которую будут записаны файлы сборки.
       *
       * Обоснование: dist/electron - стандартная папка для production сборки
       * Electron приложений, отделенная от dev сборки.
       */
      path: path.resolve(__dirname, 'dist/electron'),

      /**
       * Шаблон имени файлов
       *
       * @description Определяет имена выходных файлов на основе точек входа.
       *
       * Обоснование: [name] заменяется на имя точки входа (main, preload),
       * что создает понятные имена файлов.
       */
      filename: '[name].js',

      /**
       * Очистка выходной директории
       *
       * @description Удаляет все файлы из выходной директории перед сборкой.
       *
       * Обоснование: Очистка предотвращает накопление устаревших файлов
       * и обеспечивает чистую сборку.
       */
      clean: true,
    },

    /**
     * Настройка source maps для отладки
     *
     * @description Включает source maps в development режиме для отладки
     * TypeScript кода. Отключает в production для оптимизации размера.
     *
     * Обоснование: Source maps необходимы для отладки TypeScript кода,
     * но увеличивают размер bundle в production.
     *
     * Документация: https://webpack.js.org/configuration/devtool/
     */
    devtool: isProduction ? false : 'source-map',

    /**
     * Настройка target для Node.js окружения
     *
     * @description Указывает Webpack, что код будет выполняться в Node.js окружении
     * Electron main процесса, а не в браузере.
     *
     * Обоснование: Electron main процесс работает в Node.js окружении,
     * поэтому необходимо указать правильный target для корректной сборки.
     *
     * Документация: https://webpack.js.org/configuration/target/
     */
    target: 'electron-main',
  };
};
