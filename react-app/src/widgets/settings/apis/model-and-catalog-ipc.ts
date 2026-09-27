/**
 * @module ModelAndCatalogIpcApi
 * Тонкий фасад ModelOperationResult над BackendClient (catalog/model).
 */

import { BackendError, getBackendClient } from '../../../shared/api/ipc';
import type { InstallProgress } from '../../../shared/api/ipc';
import { DEFAULT_CONFIG } from '../constants/electron';
import type {
  GetCatalogParams,
  ModelSearchFilters,
  InstallModelParams,
  RemoveModelParams,
  GetModelInfoParams,
  ListInstalledModelsParams,
  ModelInstallProgress,
  ModelOperationResult,
  ModelProgressCallback,
  ModelErrorCallback,
  SettingsApiConfig,
} from '../types/model-ipc';

function failResult(error: unknown): ModelOperationResult {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return {
    success: false,
    error: errorMessage,
  };
}

function okResult<T>(data: T): ModelOperationResult<T> {
  return {
    success: true,
    data,
  };
}

function toInstallProgress(progress: InstallProgress): ModelInstallProgress {
  return {
    status: progress.status,
    name: progress.name,
    size: progress.size,
    total: progress.total,
    error: progress.error,
  };
}

/**
 * @class ModelAndCatalogIpc
 * Обёртка catalog/model для settings. Envelope для Redux, без window.electron.
 */
class ModelAndCatalogIpc {
  private config: SettingsApiConfig;
  private progressCallbacks = new Map<string, ModelProgressCallback>();
  private errorCallbacks = new Map<string, ModelErrorCallback>();
  private unsubscribeInstall?: () => void;

  constructor(config?: Partial<SettingsApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.unsubscribeInstall = getBackendClient().model.onInstallProgress(
      (progress: InstallProgress) => {
        const mapped = toInstallProgress(progress);
        const callback = this.progressCallbacks.get(mapped.name);
        if (callback) {
          callback(mapped);
        }
        if (mapped.status === 'complete' || mapped.status === 'error') {
          this.progressCallbacks.delete(mapped.name);
          if (mapped.status === 'error' && mapped.error) {
            const errorCallback = this.errorCallbacks.get(mapped.name);
            if (errorCallback) {
              errorCallback(mapped.error);
            }
            this.errorCallbacks.delete(mapped.name);
          }
        }
      }
    );
  }

  /**
   * Получает каталог доступных моделей.
   */
  async getCatalog(
    params: GetCatalogParams = {}
  ): Promise<ModelOperationResult> {
    try {
      const data = await getBackendClient().catalog.get({
        forceRefresh: params.forceRefresh,
        id: params.id,
        url: params.url,
      });
      return okResult(data);
    } catch (error) {
      return failResult(error);
    }
  }

  /**
   * Выполняет поиск моделей по фильтрам.
   */
  async searchModels(
    filters: ModelSearchFilters
  ): Promise<ModelOperationResult> {
    try {
      const data = await getBackendClient().catalog.search(filters);
      return okResult(data);
    } catch (error) {
      return failResult(error);
    }
  }

  /**
   * Получает детальную информацию о конкретной модели.
   */
  async getModelInfo(
    params: GetModelInfoParams
  ): Promise<ModelOperationResult> {
    try {
      const data = await getBackendClient().catalog.getModelInfo({
        modelName: params.modelName,
        id: params.id,
        url: params.url,
      });
      return okResult(data);
    } catch (error) {
      return failResult(error);
    }
  }

  /**
   * Устанавливает модель с отслеживанием прогресса.
   */
  async installModel(
    params: InstallModelParams,
    onProgress?: ModelProgressCallback,
    onError?: ModelErrorCallback
  ): Promise<ModelOperationResult> {
    try {
      if (onProgress) {
        this.progressCallbacks.set(params.name, onProgress);
      }
      if (onError) {
        this.errorCallbacks.set(params.name, onError);
      }

      const data = await getBackendClient().model.install({
        name: params.name,
        tag: params.tag,
        id: params.id,
        url: params.url,
      });

      this.progressCallbacks.delete(params.name);
      this.errorCallbacks.delete(params.name);

      return okResult(data);
    } catch (error) {
      const errorMessage =
        error instanceof BackendError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error';
      const errorCallback = this.errorCallbacks.get(params.name);
      if (errorCallback) {
        errorCallback(errorMessage);
      }
      this.progressCallbacks.delete(params.name);
      this.errorCallbacks.delete(params.name);
      return failResult(error);
    }
  }

  /**
   * Удаляет установленную модель.
   */
  async removeModel(params: RemoveModelParams): Promise<ModelOperationResult> {
    try {
      const data = await getBackendClient().model.remove({
        name: params.name,
        id: params.id,
        url: params.url,
      });
      return okResult(data);
    } catch (error) {
      return failResult(error);
    }
  }

  /**
   * Получает список установленных моделей.
   */
  async listInstalledModels(
    params: ListInstalledModelsParams = {}
  ): Promise<ModelOperationResult> {
    try {
      const data = await getBackendClient().model.list({
        id: params.id,
        url: params.url,
      });
      return okResult(data);
    } catch (error) {
      return failResult(error);
    }
  }

  /**
   * Обновляет конфигурацию API клиента.
   */
  updateConfig(newConfig: Partial<SettingsApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Получает текущую конфигурацию.
   */
  getConfig(): SettingsApiConfig {
    return { ...this.config };
  }

  /**
   * Очищает все активные подписки.
   */
  cleanup(): void {
    this.progressCallbacks.clear();
    this.errorCallbacks.clear();
    this.unsubscribeInstall?.();
  }
}

function createModelAndCatalogIpc(
  config?: Partial<SettingsApiConfig>
): ModelAndCatalogIpc {
  return new ModelAndCatalogIpc(config);
}

const modelAndCatalogIpc = createModelAndCatalogIpc();

export default modelAndCatalogIpc;
