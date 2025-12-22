/**
 * @module Log
 * Утилита для логирования.
 */

import { IS_LOGGING_ENABLED } from './constants/log';

/**
 * Логирует сообщение, если логирование включено.
 *
 * @param prefix - Префикс для логирования.
 * @param message - Сообщение для логирования.
 */
function log(prefix: string = '', message: any = ''): void {
  if (IS_LOGGING_ENABLED && import.meta.env.DEV) {
    console.log(prefix, message);
  }
}

export default log;
