/**
 * @module ModelHandlers
 * IPC обработчики для работы моделями.
 * Реализует все операции для взаимодействия с моделями.
 */

import { ipcMain } from 'electron';
import { IpcHandler } from './ipc-handlers';
import { ElectronApiConfig } from '../../types/electron';
import { ollamaApi } from '../../main';
import { mainWindow } from '../../main';
import type {
  OllamaGenerateRequest,
  OllamaPullRequest,
  OllamaPullProgress,
  OllamaDeleteRequest,
  OllamaModelsResponse,
} from '../../types/ollama';

/**
 * @class ModelHandlers
 *
 * Класс для управления IPC обработчиками для всех операций с моделями.
 */
export class ModelHandlers {
  private currentAbortController: AbortController | null = null;

  /**
   * Регистрирует все IPC обработчики для моделей.
   * Настраивает обработчики для всех операций с моделями.
   */
  registerHandlers(): void {
    /**
     * Обработчик для генерации текста через Ollama.
     * Поддерживает streaming ответы и отправляет прогресс в renderer процесс.
     * Использует wrapper для автоматического логирования и обработки ошибок.
     */
    ipcMain.handle(
      'model:generate',
      IpcHandler.createHandlerWrapper(
        async (
          request: OllamaGenerateRequest,
          config: ElectronApiConfig
        ): Promise<string> => {
          // Создает новый AbortController для этой операции
          this.currentAbortController = new AbortController();

          // Валидация входящего запроса
          const validation = IpcHandler.validateRequest(request, [
            'model',
            'prompt',
          ]);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          let fullResponse = '';

          try {
            await ollamaApi!.generate(
              request,
              config,
              chunk => {
                // Отправка streaming ответов в renderer процесс
                mainWindow?.webContents.send('model:generate-progress', chunk);

                if (chunk.response) {
                  fullResponse += chunk.response;
                }
              },
              this.currentAbortController.signal
            );

            return fullResponse;
          } finally {
            // Очищает AbortController после завершения
            this.currentAbortController = null;
          }
        },
        'model:generate'
      )
    );

    /**
     * Обработчик для установки модели через Ollama.
     * Отправляет прогресс установки в renderer процесс.
     * Использует streaming wrapper для обработки прогресса.
     */
    ipcMain.handle(
      'model:install',
      IpcHandler.createStreamingHandlerWrapper(
        async (
          request: OllamaPullRequest,
          onProgress: (progress: OllamaPullProgress) => void
        ): Promise<{ success: boolean }> => {
          // Валидация входящего запроса
          const validation = IpcHandler.validateRequest(request, ['name']);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          const result = await ollamaApi!.installModel(request, progress => {
            // Отправляет прогресс установки в renderer процесс
            mainWindow?.webContents.send('model:install-progress', progress);
            // Вызывает callback для логирования прогресса
            onProgress(progress);
          });

          return { success: result.success };
        },
        'model:install'
      )
    );

    /**
     * Обработчик для удаления модели через Ollama.
     * Использует wrapper для автоматического логирования и обработки ошибок.
     */
    ipcMain.handle(
      'model:remove',
      IpcHandler.createHandlerWrapper(
        async (request: OllamaDeleteRequest): Promise<{ success: boolean }> => {
          // Валидация входящего запроса
          const validation = IpcHandler.validateRequest(request, ['name']);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          const result = await ollamaApi!.removeModel(request);
          return { success: result.success };
        },
        'model:remove'
      )
    );

    /**
     * Обработчик для получения списка моделей через Ollama.
     * Использует wrapper для автоматического логирования и обработки ошибок.
     */
    ipcMain.handle(
      'model:list',
      IpcHandler.createHandlerWrapper(
        async (): Promise<OllamaModelsResponse> => {
          const models = await ollamaApi!.listModels();
          return models;
        },
        'model:list'
      )
    );

    /**
     * Обработчик для остановки генерации через Ollama.
     * Прерывает текущую операцию генерации.
     */
    ipcMain.handle(
      'model:stop',
      IpcHandler.createHandlerWrapper(async (): Promise<void> => {
        if (this.currentAbortController) {
          this.currentAbortController.abort();
          this.currentAbortController = null;
          console.log('✅ Generation stopped');
        } else {
          console.log('⚠️ There is no active generation to stop');
        }
      }, 'model:stop')
    );
  }

  /**
   * Удаляет все IPC обработчики моделей.
   */
  removeHandlers(): void {
    console.log('🧹 Removing Model handlers...');

    ipcMain.removeHandler('model:generate');
    ipcMain.removeHandler('model:install');
    ipcMain.removeHandler('model:remove');
    ipcMain.removeHandler('model:list');
    ipcMain.removeHandler('model:stop');

    console.log('✅ Model handlers removed successfully');
  }
}
