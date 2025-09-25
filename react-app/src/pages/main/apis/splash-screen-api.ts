import { DEFAULT_CONFIG } from '../constants/splash-screen-api';
import type {
  SplashStatusData,
  SplashApiConfig,
  SplashStatusCallback,
  SplashProgressCallback,
  SplashCompleteCallback,
  SplashErrorCallback,
} from '../types/splash-screen.types';

/**
 * @module SplashScreenApi
 * @description API клиент для взаимодействия с Electron IPC в splash screen
 * Предоставляет функции для получения статуса и подписки на обновления splash screen
 */

/**
 * @description Класс для работы с Electron API splash screen
 * Инкапсулирует все операции взаимодействия с splash screen через IPC
 */
export class SplashScreenApi {
  private config: SplashApiConfig;
  private statusCallbacks: SplashStatusCallback[] = [];
  private progressCallbacks: SplashProgressCallback[] = [];
  private completeCallbacks: SplashCompleteCallback[] = [];
  private errorCallbacks: SplashErrorCallback[] = [];

  constructor(config?: Partial<SplashApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Проверяет доступность Electron API
    if (typeof window !== 'undefined' && window.electron?.splash) {
      this.setupEventListeners();
    } else {
      console.warn(
        '⚠️ Electron API is unavailable, splash screen may not work correctly'
      );
    }
  }

  /**
   * @description Получает текущий статус splash screen
   * Используется для получения актуального состояния инициализации
   * @returns Promise с текущим статусом splash screen
   */
  async getStatus(): Promise<SplashStatusData | null> {
    try {
      if (!window.electron?.splash) {
        throw new Error('❌ The Electron API is unavailable');
      }

      const status = await window.electron.splash.getStatus();

      return status;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('❌ Error getting the splash screen status:', errorMessage);

      return null;
    }
  }

  /**
   * @description Подписывается на обновления статуса splash screen
   * Используется для получения обновлений статуса в реальном времени
   * @param callback - Функция обратного вызова для получения обновлений статуса
   * @returns Функция для отписки от событий
   */
  onStatusUpdate(callback: SplashStatusCallback): () => void {
    this.statusCallbacks.push(callback);

    // Возвращает функцию для отписки
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * @description Подписывается на обновления прогресса splash screen
   * Используется для отображения прогресса инициализации
   * @param callback - Функция обратного вызова для получения обновлений прогресса
   * @returns Функция для отписки от событий
   */
  onProgressUpdate(callback: SplashProgressCallback): () => void {
    this.progressCallbacks.push(callback);

    // Возвращает функцию для отписки
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * @description Подписывается на завершение инициализации
   * Используется для скрытия splash screen
   * @param callback - Функция обратного вызова для уведомления о завершении
   * @returns Функция для отписки от событий
   */
  onComplete(callback: SplashCompleteCallback): () => void {
    this.completeCallbacks.push(callback);

    // Возвращает функцию для отписки
    return () => {
      const index = this.completeCallbacks.indexOf(callback);
      if (index > -1) {
        this.completeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * @description Подписывается на ошибки инициализации
   * Используется для отображения ошибок в splash screen
   * @param callback - Функция обратного вызова для получения ошибок
   * @returns Функция для отписки от событий
   */
  onError(callback: SplashErrorCallback): () => void {
    this.errorCallbacks.push(callback);

    // Возвращает функцию для отписки
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * @description Настраивает слушатели событий от Electron IPC
   * Подписывается на события splash screen от main процесса
   */
  private setupEventListeners(): void {
    // Проверяем доступность Electron API
    if (!window.electron?.splash) {
      console.warn(
        '⚠️ Electron API is not available for configuring splash screen listeners'
      );
      return;
    }

    // Подписывается на обновления статуса
    window.electron.splash.onStatusUpdate((status: SplashStatusData) => {
      this.statusCallbacks.forEach((callback) => callback(status));
    });

    // Подписывается на обновления прогресса
    window.electron.splash.onProgressUpdate((progress: number) => {
      this.progressCallbacks.forEach((callback) => callback(progress));
    });

    // Подписывается на завершение инициализации
    window.electron.splash.onComplete(() => {
      this.completeCallbacks.forEach((callback) => callback());
    });

    // Подписывается на ошибки
    window.electron.splash.onError((error: string) => {
      this.errorCallbacks.forEach((callback) => callback(error));
    });
  }

  /**
   * @description Обновляет конфигурацию API клиента
   * Позволяет изменить настройки во время выполнения
   * @param newConfig - Новая конфигурация
   */
  updateConfig(newConfig: Partial<SplashApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * @description Получает текущую конфигурацию
   * Возвращает копию текущих настроек
   * @returns Текущая конфигурация
   */
  getConfig(): SplashApiConfig {
    return { ...this.config };
  }

  /**
   * @description Очищает все активные подписки
   * Используется при размонтировании компонента
   */
  cleanup(): void {
    this.statusCallbacks = [];
    this.progressCallbacks = [];
    this.completeCallbacks = [];
    this.errorCallbacks = [];
  }
}

/**
 * @description Создает экземпляр API клиента
 * Фабричная функция для создания настроенного клиента
 * @param config - Конфигурация для клиента
 * @returns Экземпляр API клиента
 */
export function createSplashScreenApi(
  config?: Partial<SplashApiConfig>
): SplashScreenApi {
  return new SplashScreenApi(config);
}

/**
 * @description Глобальный экземпляр API клиента
 * Используется для единообразного доступа к API во всем приложении
 */
export const splashScreenApi = createSplashScreenApi();

export default splashScreenApi;
