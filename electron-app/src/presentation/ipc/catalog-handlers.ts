/**
 * @module CatalogHandlers
 * IPC обработчики для работы с каталогом моделей.
 * Реализует операции получения каталога, поиска и информации о моделях.
 */

import { ipcMain } from 'electron';
import { IpcHandler } from './ipc-handlers';
import type { OllamaModelInfo, ModelCatalog } from '../../types/models';
import type { CatalogFilters } from '../../types/catalog';
import { modelCatalogService } from '../../main';

/**
 * @class CatalogHandlers
 *
 * Класс для управления IPC обработчиками каталога моделей.
 */
export class CatalogHandlers {
  /**
   * Регистрирует все IPC обработчики для каталога моделей.
   * Настраивает обработчики для получения каталога, поиска и информации о моделях.
   */
  registerHandlers(): void {
    /**
     * Обработчик для получения полного каталога моделей.
     * Поддерживает принудительное обновление кэша.
     * Использует wrapper для автоматического логирования и обработки ошибок.
     */
    ipcMain.handle(
      'catalog:get',
      IpcHandler.createHandlerWrapper(
        async (
          params: { forceRefresh?: boolean } = {}
        ): Promise<ModelCatalog> => {
          const result = await modelCatalogService!.getAvailableModels(
            params.forceRefresh || false
          );

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to get catalog');
          }

          return result.data;
        },
        'catalog:get'
      )
    );

    /**
     * Обработчик для поиска моделей по фильтрам.
     * Поддерживает различные параметры фильтрации и поиска.
     * Использует wrapper для автоматического логирования и обработки ошибок.
     */
    ipcMain.handle(
      'catalog:search',
      IpcHandler.createHandlerWrapper(
        async (filters: CatalogFilters): Promise<ModelCatalog> => {
          // Валидация входящих фильтров
          const validation = IpcHandler.validateRequest(filters, []);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          const result = await modelCatalogService!.searchModels(filters);

          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to search models');
          }

          return result.data;
        },
        'catalog:search'
      )
    );

    /**
     * Обработчик для получения информации о конкретной модели.
     * Возвращает детальную информацию о модели из каталога.
     * Использует wrapper для автоматического логирования и обработки ошибок.
     */
    ipcMain.handle(
      'catalog:get-model-info',
      IpcHandler.createHandlerWrapper(
        async (params: {
          modelName: string;
        }): Promise<OllamaModelInfo | null> => {
          // Валидация входящего запроса
          const validation = IpcHandler.validateRequest(params, ['modelName']);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          const result = await modelCatalogService!.getModelInfo(
            params.modelName
          );

          if (!result.success) {
            throw new Error(result.error || 'Failed to get model info');
          }

          return result.data || null;
        },
        'catalog:get-model-info'
      )
    );
  }

  /**
   * Удаляет все IPC обработчики каталога моделей.
   */
  removeHandlers(): void {
    console.log('🧹 Removing Catalog handlers...');

    ipcMain.removeHandler('catalog:get');
    ipcMain.removeHandler('catalog:search');
    ipcMain.removeHandler('catalog:get-model-info');

    console.log('✅ Catalog handlers removed successfully');
  }
}
