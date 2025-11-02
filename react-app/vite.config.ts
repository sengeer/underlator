import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { lingui } from '@lingui/vite-plugin';

/**
 * Vite конфигурация для React frontend
 *
 * @description Настраивает Vite для сборки React приложения
 * с поддержкой TypeScript, интернационализации и современного JavaScript.
 *
 * Документация: https://vitejs.dev/config/
 */

export default defineConfig({
  /**
   * Базовый URL для приложения
   *
   * @description Определяет базовый URL для статических ресурсов.
   * './' означает относительные пути для Electron приложения.
   *
   * Обоснование: Electron приложения используют относительные пути
   * для корректной работы с файловой системой.
   *
   * Документация: https://vitejs.dev/config/shared-options.html#base
   */
  base: './',

  /**
   * Директория публичных файлов
   *
   * @description Указывает директорию с публичными файлами,
   * которые копируются в корень сборки без обработки.
   *
   * Обоснование: Публичные файлы (иконки, манифесты) должны
   * быть доступны напрямую без обработки сборщиком.
   *
   * Документация: https://vitejs.dev/config/shared-options.html#publicdir
   */
  publicDir: 'public',

  /**
   * Плагины Vite
   *
   * @description Определяет плагины, которые расширяют
   * функциональность Vite.
   *
   * Обоснование: Плагины обеспечивают дополнительную функциональность
   * для работы с React и интернационализацией.
   *
   * Документация: https://vitejs.dev/config/shared-options.html#plugins
   */
  plugins: [
    /**
     * React плагин для Vite
     *
     * @description Обеспечивает поддержку React в Vite
     * с горячей перезагрузкой и оптимизациями.
     *
     * Обоснование: React требует специальной обработки
     * для корректной работы с JSX и современными возможностями.
     *
     * Документация: https://github.com/vitejs/vite-plugin-react
     */
    react({
      /**
       * Конфигурация Babel
       *
       * @description Настраивает Babel для обработки React кода
       * с поддержкой Lingui макросов.
       *
       * Обоснование: Lingui использует Babel макросы для интернационализации,
       * которые должны обрабатываться во время сборки.
       *
       * Документация: https://lingui.dev/ref/conf#babel
       */
      babel: {
        /**
         * Плагины Babel
         *
         * @description Определяет Babel плагины для обработки кода.
         * @lingui/babel-plugin-lingui-macro обрабатывает макросы интернационализации.
         *
         * Обоснование: Lingui макросы должны обрабатываться Babel
         * для корректной работы интернационализации.
         *
         * Документация: https://lingui.dev/ref/conf#babel-plugins
         */
        plugins: ['@lingui/babel-plugin-lingui-macro'],
      },
    }),

    /**
     * Плагин Lingui для Vite
     *
     * @description Интегрирует Lingui с Vite для автоматической
     * генерации переводов во время разработки.
     *
     * Обоснование: Lingui требует специальной интеграции с Vite
     * для корректной работы интернационализации.
     *
     * Документация: https://lingui.dev/ref/conf#vite
     */
    lingui(),
  ],

  /**
   * Конфигурация dev сервера
   *
   * @description Настраивает параметры dev сервера Vite
   * для разработки приложения.
   *
   * Обоснование: Dev сервер обеспечивает быструю разработку
   * с горячей перезагрузкой и отладкой.
   *
   * Документация: https://vitejs.dev/config/server-options.html
   */
  server: {
    /**
     * Порт dev сервера
     *
     * @description Указывает порт для dev сервера Vite.
     * 8000 - стандартный порт для разработки.
     *
     * Обоснование: Фиксированный порт упрощает настройку
     * и интеграцию с другими инструментами разработки.
     *
     * Документация: https://vitejs.dev/config/server-options.html#server-port
     */
    port: 8000,

    /**
     * Строгий порт
     *
     * @description Состояние false разрешает автоматический выбор другого порта,
     * если указанный порт занят.
     *
     * Документация: https://vitejs.dev/config/server-options.html#server-strictport
     */
    strictPort: false,

    /**
     * Автоматическое открытие браузера
     *
     * @description Автоматически открывает браузер при запуске
     * dev сервера.
     *
     * Обоснование: Автоматическое открытие браузера ускоряет
     * процесс разработки и улучшает пользовательский опыт.
     *
     * Документация: https://vitejs.dev/config/server-options.html#server-open
     */
    open: true,
  },
});
