/**
 * @module ModelIpcApi
 * API клиент для взаимодействия с Model IPC.
 */

import { log } from '../../../utils/log';
import type { GenerateResponse, GenerateRequest } from '../types/model-ipc';

/**
 * Класс для работы с Model IPC API.
 * Инкапсулирует Model IPC функционал для генерации текста.
 */
export class Electron {
  /**
   * Генерирует текст через Model IPC.
   *
   * @param request - Сформированный запрос для генерации.
   * @param config - Конфигурация для API.
   * @returns Promise с полным ответом.
   */
  async generate(
    request: GenerateRequest & GenerateOptions,
    config?: ProviderSettings
  ): Promise<string> {
    if (!window.electron?.model) {
      throw new Error('Electron API is unavailable');
    }

    log('[Model IPC]', `generate: ${request}`);
    log('[Model IPC]', `config: ${config}`);

    // Вызывает IPC и проверяет результат
    const response = await window.electron.model.generate(request, config);

    // Проверяет успешность операции IPC
    if (typeof response === 'object' && response !== null) {
      if ('success' in response && !response.success) {
        // Если операция не успешна, бросает исключение с ошибкой
        const errorMessage =
          'error' in response ? String(response.error) : 'Unknown IPC error';
        throw new Error(`IPC Operation failed: ${errorMessage}`);
      }

      // Если это успешный IPC ответ с данными
      if ('data' in response) {
        return String(response.data);
      }
    }

    // Если это обычная строка (старый формат)
    return String(response);
  }

  /**
   * Подписывается на прогресс генерации через Model IPC.
   *
   * @param callback - Callback для обработки streaming ответов.
   * @returns Функция для отписки.
   */
  onGenerateProgress(
    callback: (progress: GenerateResponse) => void
  ): () => void {
    if (!window.electron?.model) {
      throw new Error('Electron API is unavailable');
    }

    return window.electron.model.onGenerateProgress(callback);
  }
}

/**
 * Глобальный экземпляр API клиента.
 * Используется для единообразного доступа к API во всем приложении.
 */
export const electron = new Electron();

export default electron;
