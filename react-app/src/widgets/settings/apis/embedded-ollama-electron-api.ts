import type {
  GetCatalogParams,
  ModelSearchFilters,
  InstallModelParams,
  RemoveModelParams,
  GetModelInfoParams,
  ModelInstallProgress,
  ModelOperationResult,
  ModelProgressCallback,
  ModelErrorCallback,
  SettingsApiConfig,
} from '../types';
import { DEFAULT_CONFIG } from './constants';

/**
 * @module EmbeddedOllamaElectronApi
 * @description API клиент для взаимодействия с Electron IPC в Settings виджете
 * Предоставляет функции для управления каталогом моделей
 */

/**
 * @description Класс для работы с Electron API
 * Инкапсулирует Electron IPC операции
 */
export class EmbeddedOllamaElectronApi {
  private config: SettingsApiConfig;
  private progressCallbacks = new Map<string, ModelProgressCallback>();
  private errorCallbacks = new Map<string, ModelErrorCallback>();

  constructor(config?: Partial<SettingsApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Проверяет доступность Electron API
    if (typeof window !== 'undefined' && window.electron) {
      this.setupProgressListeners();
    } else {
      console.warn(
        'Electron API недоступен, некоторые функции могут не работать'
      );
    }
  }

  /**
   * @description Получает каталог доступных моделей Ollama
   * Поддерживает кэширование и принудительное обновление
   * @param params - Параметры получения каталога
   * @returns Promise с каталогом моделей
   */
  async getCatalog(
    params: GetCatalogParams = {}
  ): Promise<ModelOperationResult> {
    try {
      this.log('Получение каталога моделей', params);

      if (!window.electron?.catalog) {
        throw new Error('Electron API недоступен');
      }

      const response = await window.electron.catalog.get({
        forceRefresh: params.forceRefresh,
      });

      this.log('Каталог получен', response);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.log('Ошибка получения каталога', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * @description Выполняет поиск моделей по фильтрам
   * Поддерживает поиск по названию, размеру, тегам и другим параметрам
   * @param filters - Фильтры для поиска
   * @returns Promise с результатами поиска
   */
  async searchModels(
    filters: ModelSearchFilters
  ): Promise<ModelOperationResult> {
    try {
      this.log('Поиск моделей', filters);

      if (!window.electron?.catalog) {
        throw new Error('Electron API недоступен');
      }

      const response = await window.electron.catalog.search(filters);

      this.log('Результаты поиска', response);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.log('Ошибка поиска моделей', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * @description Получает детальную информацию о конкретной модели
   * Используется для отображения подробной информации о модели
   * @param params - Параметры получения информации о модели
   * @returns Promise с информацией о модели
   */
  async getModelInfo(
    params: GetModelInfoParams
  ): Promise<ModelOperationResult> {
    try {
      this.log('Получение информации о модели', params);

      if (!window.electron?.catalog) {
        throw new Error('Electron API недоступен');
      }

      const response = await window.electron.catalog.getModelInfo({
        modelName: params.modelName,
      });

      this.log('Информация о модели получена', response);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.log('Ошибка получения информации о модели', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * @description Устанавливает модель с отслеживанием прогресса
   * Подписывается на события прогресса и обрабатывает ошибки
   * @param params - Параметры установки модели
   * @param onProgress - Callback для обработки прогресса
   * @param onError - Callback для обработки ошибок
   * @returns Promise с результатом установки
   */
  async installModel(
    params: InstallModelParams,
    onProgress?: ModelProgressCallback,
    onError?: ModelErrorCallback
  ): Promise<ModelOperationResult> {
    try {
      this.log('Установка модели', params);

      // Callbacks для прогресса и ошибок установки модели
      if (onProgress) {
        this.progressCallbacks.set(params.name, onProgress);
      }
      if (onError) {
        this.errorCallbacks.set(params.name, onError);
      }

      if (!window.electron?.models) {
        throw new Error('Electron API недоступен');
      }

      const response = await window.electron.models.install({
        name: params.name,
        tag: params.tag,
      });

      this.log('Модель установлена', response);

      // Очищает callbacks
      this.progressCallbacks.delete(params.name);
      this.errorCallbacks.delete(params.name);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.log('Ошибка установки модели', errorMessage);

      // Вызывает callback ошибки, если есть
      const errorCallback = this.errorCallbacks.get(params.name);
      if (errorCallback) {
        errorCallback(errorMessage);
      }

      // Очищает callbacks при ошибке
      this.progressCallbacks.delete(params.name);
      this.errorCallbacks.delete(params.name);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * @description Удаляет установленную модель
   * Используется для удаления модели
   * @param params - Параметры удаления модели
   * @returns Promise с результатом удаления
   */
  async removeModel(params: RemoveModelParams): Promise<ModelOperationResult> {
    try {
      this.log('Удаление модели', params);

      if (!window.electron?.models) {
        throw new Error('Electron API недоступен');
      }

      const response = await window.electron.models.remove({
        name: params.name,
      });

      this.log('Модель удалена', response);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.log('Ошибка удаления модели', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * @description Получает список установленных моделей
   * Используется для проверки статуса моделей
   * @returns Promise со списком установленных моделей
   */
  async listInstalledModels(): Promise<ModelOperationResult> {
    try {
      this.log('Получение списка установленных моделей');

      if (!window.electron?.models) {
        throw new Error('Electron API недоступен');
      }

      const response = await window.electron.models.list();

      this.log('Список моделей получен', response);

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.log('Ошибка получения списка моделей', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * @description Настраивает слушатели прогресса установки
   * Подписывается на события прогресса от Electron IPC
   */
  private setupProgressListeners(): void {
    // Проверяем доступность Electron API
    if (!window.electron?.models) {
      console.warn(
        'Electron API недоступен для настройки слушателей прогресса'
      );
      return;
    }

    // Подписывается на прогресс установки моделей
    window.electron.models.onInstallProgress(
      (progress: ModelInstallProgress) => {
        // Вызывает callback для конкретной модели
        const callback = this.progressCallbacks.get(progress.name);
        if (callback) {
          callback(progress);
        }

        // Очищает callback, если установка завершена или произошла ошибка
        if (progress.status === 'complete' || progress.status === 'error') {
          this.progressCallbacks.delete(progress.name);

          if (progress.status === 'error' && progress.error) {
            const errorCallback = this.errorCallbacks.get(progress.name);
            if (errorCallback) {
              errorCallback(progress.error);
            }
            this.errorCallbacks.delete(progress.name);
          }
        }
      }
    );
  }

  /**
   * @description Логирует операции если включено логирование
   * Используется для отладки и мониторинга
   * @param message - Сообщение для логирования
   * @param data - Дополнительные данные
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`🔌 EmbeddedOllamaApi: ${message}`, data || '');
    }
  }

  /**
   * @description Обновляет конфигурацию API клиента
   * Позволяет изменить настройки во время выполнения
   * @param newConfig - Новая конфигурация
   */
  updateConfig(newConfig: Partial<SettingsApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * @description Получает текущую конфигурацию
   * Возвращает копию текущих настроек
   * @returns Текущая конфигурация
   */
  getConfig(): SettingsApiConfig {
    return { ...this.config };
  }

  /**
   * @description Очищает все активные подписки
   * Используется при размонтировании компонента
   */
  cleanup(): void {
    this.progressCallbacks.clear();
    this.errorCallbacks.clear();
  }
}

/**
 * @description Создает экземпляр API клиента
 * Фабричная функция для создания настроенного клиента
 * @param config - Конфигурация для клиента
 * @returns Экземпляр API клиента
 */
export function createEmbeddedOllamaElectronApi(
  config?: Partial<SettingsApiConfig>
): EmbeddedOllamaElectronApi {
  return new EmbeddedOllamaElectronApi(config);
}

/**
 * @description Глобальный экземпляр API клиента
 * Используется для единообразного доступа к API во всем приложении
 */
export const embeddedOllamaElectronApi = createEmbeddedOllamaElectronApi();

export default embeddedOllamaElectronApi;
