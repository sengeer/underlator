import pluginN from 'eslint-plugin-n';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

/**
 * ESLint конфигурация для Electron приложения
 *
 * @description Настраивает ESLint для проверки кода в Electron приложении
 * с поддержкой TypeScript, Node.js и современных JavaScript возможностей.
 *
 * Документация: https://eslint.org/docs/latest/use/configure/
 */
export default [
  /**
   * Глобальные игнорируемые файлы и директории
   *
   * @description Определяет файлы и директории, которые ESLint
   * должен игнорировать при проверке кода.
   *
   * Обоснование: Игнорирование служебных файлов и директорий
   * ускоряет проверку и предотвращает ложные ошибки.
   *
   * Документация: https://eslint.org/docs/latest/use/configure/ignore
   */
  {
    ignores: [
      /**
       * Cкомпилированные файлы
       *
       * @description Игнорирует все файлы в директории dist,
       * так как это скомпилированные файлы, которые не нужно проверять.
       *
       * Обоснование: Скомпилированные файлы генерируются автоматически
       * и не должны проверяться линтером.
       */
      'dist/**/*',

      /**
       * Выходные файлы Electron Forge
       *
       * @description Игнорирует все файлы в директории out,
       * так как это выходные файлы Electron Forge.
       *
       * Обоснование: Выходные файлы Electron Forge генерируются
       * автоматически и не должны проверяться линтером.
       */
      'out/**/*',

      /**
       * Зависимости
       *
       * @description Игнорирует все файлы в node_modules,
       * так как это внешние зависимости.
       *
       * Обоснование: Внешние зависимости не должны проверяться
       * линтером проекта.
       */
      'node_modules/**/*',

      /**
       * Файлы JavaScript
       *
       * @description Игнорирует JavaScript файлы конфигурации,
       * так как они могут не соответствовать правилам проекта.
       *
       * Обоснование: Конфигурационные файлы часто имеют
       * специфичный синтаксис, который не должен проверяться.
       */
      '*.js',

      /**
       * Модули ES
       *
       * @description Игнорирует ES модули конфигурации,
       * так как они могут не соответствовать правилам проекта.
       *
       * Обоснование: Конфигурационные ES модули часто имеют
       * специфичный синтаксис, который не должен проверяться.
       */
      '*.mjs',

      /**
       * Файлы Webpack
       *
       * @description Игнорирует все файлы в директории .webpack,
       * так как это служебные файлы Webpack.
       *
       * Обоснование: Служебные файлы Webpack генерируются
       * автоматически и не должны проверяться линтером.
       */
      '.webpack/**/*',

      /**
       * Конфигурация Electron Forge
       *
       * @description Игнорирует конфигурационный файл Electron Forge,
       * так как он имеет специфичные требования к синтаксису.
       *
       * Обоснование: Конфигурация Electron Forge может иметь
       * специфичный синтаксис, который не должен проверяться.
       */
      'forge.config.ts',
    ],
  },

  /**
   * Основная конфигурация ESLint для TypeScript файлов
   *
   * @description Настраивает ESLint для проверки TypeScript файлов
   * в директории src с поддержкой Node.js и современных возможностей.
   *
   * Обоснование: TypeScript файлы требуют специальной конфигурации
   * для корректной работы с типами и современными возможностями.
   *
   * Документация: https://eslint.org/docs/latest/use/configure/
   */
  {
    /**
     * Файлы для применения конфигурации
     *
     * @description Определяет какие файлы должны проверяться
     * с использованием этой конфигурации.
     *
     * Обоснование: Ограничение области действия конфигурации
     * обеспечивает корректную работу с разными типами файлов.
     *
     * Документация: https://eslint.org/docs/latest/use/configure/#specifying-files-and-ignores
     */
    files: ['src/**/*.{js,ts,tsx}'],

    /**
     * Опции языка и парсера
     *
     * @description Настраивает опции языка, глобальные переменные
     * и парсер для корректной работы ESLint.
     *
     * Обоснование: Правильные настройки языка обеспечивают
     * корректную работу ESLint с современным JavaScript/TypeScript.
     *
     * Документация: https://eslint.org/docs/latest/use/configure/#specifying-language-options
     */
    languageOptions: {
      /**
       * Глобальные переменные
       *
       * @description Определяет глобальные переменные, доступные
       * в коде без явного объявления.
       *
       * Обоснование: Electron приложения работают в среде Node.js
       * и браузера, поэтому необходимы соответствующие глобальные переменные.
       *
       * Документация: https://eslint.org/docs/latest/use/configure/#specifying-globals
       */
      globals: {
        /**
         * Глобальные переменные браузера
         *
         * @description Включает глобальные переменные браузера
         * для работы с DOM и Web API.
         *
         * Обоснование: Electron renderer процесс работает
         * в контексте браузера и имеет доступ к Web API.
         */
        ...globals.browser,

        /**
         * Глобальные переменные Node.js
         *
         * @description Включает глобальные переменные Node.js
         * для работы с файловой системой и модулями.
         *
         * Обоснование: Electron main процесс работает
         * в контексте Node.js и имеет доступ к Node.js API.
         */
        ...globals.node,

        /**
         * Глобальные переменные ES2021
         *
         * @description Включает глобальные переменные ES2021
         * для работы с современными JavaScript возможностями.
         *
         * Обоснование: Проект использует современные JavaScript
         * возможности, поэтому необходимы соответствующие глобальные переменные.
         */
        ...globals.es2021,
      },

      /**
       * Параметры парсера для TypeScript
       *
       * @description Указывает парсер для обработки TypeScript кода.
       * @typescript-eslint/parser поддерживает TypeScript синтаксис.
       *
       * Обоснование: TypeScript код требует специального парсера
       * для корректной обработки типов и синтаксиса.
       *
       * Документация: https://eslint.org/docs/latest/use/configure/#specifying-parser
       */
      parser: typescriptParser,

      /**
       * Опции парсера
       *
       * @description Настраивает опции парсера для корректной
       * обработки TypeScript кода.
       *
       * Обоснование: Правильные опции парсера обеспечивают
       * корректную работу с современным TypeScript.
       *
       * Документация: https://eslint.org/docs/latest/use/configure/#specifying-parser-options
       */
      parserOptions: {
        /**
         * Версия ECMAScript
         *
         * @description Указывает версию ECMAScript для парсера.
         * 'latest' включает все современные возможности.
         *
         * Обоснование: Использование последней версии ECMAScript
         * обеспечивает поддержку всех современных возможностей.
         *
         * Документация: https://eslint.org/docs/latest/use/configure/#ecmaversion
         */
        ecmaVersion: 'latest',

        /**
         * Тип исходного кода
         *
         * @description Указывает тип исходного кода.
         * 'module' означает, что код использует ES модули.
         *
         * Обоснование: Современные проекты используют ES модули,
         * поэтому sourceType должен быть установлен в 'module'.
         *
         * Документация: https://eslint.org/docs/latest/use/configure/#sourcetype
         */
        sourceType: 'module',

        /**
         * Путь к tsconfig.json
         *
         * @description Указывает путь к файлу конфигурации TypeScript
         * для корректной работы с типами.
         *
         * Обоснование: Парсер TypeScript должен знать о настройках
         * проекта для корректной работы с типами.
         *
         * Документация: https://typescript-eslint.io/getting-started/typed-linting/
         */
        project: './tsconfig.json',
      },
    },

    /**
     * Плагины ESLint
     *
     * @description Определяет плагины, которые расширяют
     * функциональность ESLint.
     *
     * Обоснование: Плагины обеспечивают дополнительную функциональность
     * для работы с Node.js и TypeScript.
     *
     * Документация: https://eslint.org/docs/latest/use/configure/#configuring-plugins
     */
    plugins: {
      /**
       * Плагин для Node.js
       *
       * @description Плагин для проверки кода, специфичного для Node.js.
       * Предоставляет правила для работы с Node.js API.
       *
       * Обоснование: Electron приложения работают в среде Node.js,
       * поэтому необходимы правила для Node.js кода.
       *
       * Документация: https://github.com/eslint-community/eslint-plugin-n
       */
      n: pluginN,

      /**
       * Плагин для TypeScript
       *
       * @description Плагин для проверки TypeScript кода.
       * Предоставляет правила для работы с типами и TypeScript синтаксисом.
       *
       * Обоснование: TypeScript код требует специальных правил
       * для работы с типами и современным синтаксисом.
       *
       * Документация: https://typescript-eslint.io/
       */
      '@typescript-eslint': typescriptEslint,
    },

    /**
     * Правила ESLint
     *
     * @description Определяет правила, которые ESLint должен применять
     * при проверке кода.
     *
     * Обоснование: Правила обеспечивают качество кода и соответствие
     * стандартам проекта.
     *
     * Документация: https://eslint.org/docs/latest/use/configure/#configuring-rules
     */
    rules: {
      /**
       * Правила Node.js
       *
       * @description Правила для проверки кода, специфичного для Node.js.
       * Включает рекомендуемые правила и настройки для Node.js 18+.
       *
       * Обоснование: Node.js код требует специальных правил
       * для обеспечения качества и совместимости.
       *
       * Документация: https://github.com/eslint-community/eslint-plugin-n
       */
      ...pluginN.configs['recommended-script'].rules,

      /**
       * Проверка ES синтаксиса
       *
       * @description Проверяет использование ES синтаксиса,
       * поддерживаемого в указанной версии Node.js.
       *
       * Обоснование: Обеспечивает совместимость кода с Node.js 18+,
       * который поддерживает современные ES возможности.
       *
       * Документация: https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-unsupported-features/es-syntax.md
       */
      'n/no-unsupported-features/es-syntax': [
        'error',
        { version: '>=18.18.2', ignores: [] },
      ],

      /**
       * Проверка Node.js встроенных модулей
       *
       * @description Проверяет использование Node.js встроенных модулей,
       * поддерживаемых в указанной версии Node.js.
       *
       * Обоснование: Обеспечивает совместимость с Node.js 18+,
       * который поддерживает современные встроенные модули.
       *
       * Документация: https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-unsupported-features/node-builtins.md
       */
      'n/no-unsupported-features/node-builtins': [
        'error',
        {
          version: '>=18.18.2',
          /**
           * Игнорируемые модули
           *
           * @description Список модулей, которые не должны проверяться
           * на совместимость с версией Node.js.
           *
           * Обоснование: fetch, Response, Headers, Request доступны
           * в Node.js 18+ как экспериментальные функции.
           */
          ignores: ['fetch', 'Response', 'Headers', 'Request'],
        },
      ],

      /**
       * Запрет require неопубликованных модулей
       *
       * @description Отключает проверку require неопубликованных модулей,
       * так как в Electron проекте могут использоваться dev зависимости.
       *
       * Обоснование: Electron проекты часто используют dev зависимости
       * в production коде, что является нормальной практикой.
       *
       * Документация: https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-unpublished-require.md
       */
      'n/no-unpublished-require': 'off',

      /**
       * Запрет import неопубликованных модулей
       *
       * @description Отключает проверку import неопубликованных модулей,
       * так как в Electron проекте могут использоваться dev зависимости.
       *
       * Обоснование: Electron проекты часто используют dev зависимости
       * в production коде, что является нормальной практикой.
       *
       * Документация: https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-unpublished-import.md
       */
      'n/no-unpublished-import': 'off',

      /**
       * Проверка отсутствующих импортов
       *
       * @description Отключает проверку отсутствующих импортов,
       * так как TypeScript парсер может не корректно обрабатывать некоторые случаи.
       *
       * Обоснование: TypeScript компилятор уже проверяет импорты,
       * поэтому дополнительная проверка ESLint может быть избыточной.
       *
       * Документация: https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-missing-import.md
       */
      'n/no-missing-import': 'off',

      /**
       * Правила TypeScript
       *
       * @description Правила для проверки TypeScript кода.
       * Включает рекомендуемые правила и настройки для TypeScript.
       *
       * Обоснование: TypeScript код требует специальных правил
       * для обеспечения качества типов и кода.
       *
       * Документация: https://typescript-eslint.io/
       */
      ...typescriptEslint.configs.recommended.rules,

      /**
       * Проверка неиспользуемых переменных
       *
       * @description Проверяет неиспользуемые переменные в TypeScript коде
       * с игнорированием параметров, начинающихся с подчеркивания.
       *
       * Обоснование: Неиспользуемые переменные указывают на проблемы
       * в коде, но параметры с подчеркиванием часто используются
       * для обозначения неиспользуемых параметров.
       *
       * Документация: https://typescript-eslint.io/rules/no-unused-vars/
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],

      /**
       * Явные типы возврата
       *
       * @description Отключает требование явного указания типа возврата
       * для функций, так как TypeScript может выводить типы автоматически.
       *
       * Обоснование: Автоматический вывод типов упрощает код
       * и делает его более читаемым, особенно для простых функций.
       *
       * Документация: https://typescript-eslint.io/rules/explicit-function-return-type/
       */
      '@typescript-eslint/explicit-function-return-type': 'off',

      /**
       * Явные типы модулей
       *
       * @description Отключает требование явного указания типов
       * для экспортируемых функций и классов.
       *
       * Обоснование: Автоматический вывод типов упрощает код
       * и делает его более читаемым, особенно для простых модулей.
       *
       * Документация: https://typescript-eslint.io/rules/explicit-module-boundary-types/
       */
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      /**
       * Запрет any типов
       *
       * @description Предупреждает об использовании any типов,
       * но не блокирует компиляцию.
       *
       * Обоснование: any типы снижают безопасность типов,
       * но иногда необходимы для совместимости с внешними библиотеками.
       *
       * Документация: https://typescript-eslint.io/rules/no-explicit-any/
       */
      '@typescript-eslint/no-explicit-any': 'warn',

      /**
       * Запрет non-null assertions
       *
       * @description Предупреждает об использовании non-null assertions (!),
       * но не блокирует компиляцию.
       *
       * Обоснование: Non-null assertions могут привести к ошибкам
       * во время выполнения, но иногда необходимы для работы с DOM.
       *
       * Документация: https://typescript-eslint.io/rules/no-non-null-assertion/
       */
      '@typescript-eslint/no-non-null-assertion': 'warn',

      /**
       * Запрет require импортов
       *
       * @description Отключает запрет на использование require импортов,
       * так как в Node.js проектах это нормальная практика.
       *
       * Обоснование: Node.js проекты часто используют require
       * для динамических импортов и совместимости с CommonJS.
       *
       * Документация: https://typescript-eslint.io/rules/no-require-imports/
       */
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
