import type { OllamaGenerateRequest, OllamaGenerateResponse } from './types';

/**
 * @module EmbeddedOllamaElectronApi
 * @description API клиент для взаимодействия с Electron IPC
 * Предоставляет функции для работы с Ollama через Electron IPC
 */

/**
 * @description Класс для работы с Electron API
 * Инкапсулирует Electron IPC операции для Ollama
 */
export class EmbeddedOllamaElectronApi {
  /**
   * @description Генерирует текст через Ollama API через Electron IPC
   * @param request - Параметры генерации
   * @param signal - AbortSignal для отмены операции
   * @returns Promise с полным ответом
   */
  async generate(request: OllamaGenerateRequest): Promise<string> {
    if (!window.electron?.ollama) {
      throw new Error('❌ Electron API is unavailable');
    }

    return await window.electron.ollama.generate(request);
  }

  /**
   * @description Подписывается на прогресс генерации через Electron IPC
   * @param callback - Callback для обработки streaming ответов
   * @returns Функция для отписки
   */
  onGenerateProgress(
    callback: (progress: OllamaGenerateResponse) => void
  ): () => void {
    if (!window.electron?.ollama) {
      throw new Error('❌ Electron API is unavailable');
    }

    return window.electron.ollama.onGenerateProgress(callback);
  }
}

/**
 * @description Глобальный экземпляр API клиента
 * Используется для единообразного доступа к API во всем приложении
 */
export const embeddedOllamaElectronApi = new EmbeddedOllamaElectronApi();

export default embeddedOllamaElectronApi;
