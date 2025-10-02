/**
 * @module ElectronApi
 * API клиент для взаимодействия с Electron IPC.
 */

import type { GenerateResponse, GenerateRequest } from '../types/electron';

/**
 * Класс для работы с Electron API.
 * Инкапсулирует Electron IPC функционал для генерации текста.
 */
export class Electron {
  /**
   * Генерирует текст через Electron IPC.
   * @param request - Сформированный запрос для генерации.
   * @param config - Конфигурация для API.
   * @returns Promise с полным ответом.
   */
  async generate(
    request: GenerateRequest & GenerateOptions,
    config?: ProviderSettings
  ): Promise<string> {
    if (!window.electron?.ollama) {
      throw new Error('❌ Electron API is unavailable');
    }

    console.log('🚀 request', request);
    console.log('🚀 config', config);

    return await window.electron.ollama.generate(request, config);
  }

  /**
   * Подписывается на прогресс генерации через Electron IPC.
   * @param callback - Callback для обработки streaming ответов.
   * @returns Функция для отписки.
   */
  onGenerateProgress(
    callback: (progress: GenerateResponse) => void
  ): () => void {
    if (!window.electron?.ollama) {
      throw new Error('❌ Electron API is unavailable');
    }

    return window.electron.ollama.onGenerateProgress(callback);
  }
}

/**
 * Глобальный экземпляр API клиента.
 * Используется для единообразного доступа к API во всем приложении.
 */
export const electron = new Electron();

export default electron;
