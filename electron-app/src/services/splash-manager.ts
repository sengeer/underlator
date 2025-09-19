import { BrowserWindow } from 'electron';
import {
  DEFAULT_SPLASH_CONFIG,
  SPLASH_MESSAGES,
  SPLASH_TIMING,
  SPLASH_IPC_EVENTS,
} from '../constants/splash.constants';
import type {
  SplashConfig,
  SplashMessages,
  SplashStatusCallback,
  SplashProgressCallback,
  SplashCompleteCallback,
  SplashErrorCallback,
  SplashOperationResult,
} from '../types/splash.types';

/**
 * @class SplashManager
 * @description Менеджер для управления splash screen в Electron main process
 * Обеспечивает централизованное управление состоянием и передачу событий в renderer процесс
 */
export class SplashManager {
  private config: SplashConfig;
  private mainWindow: BrowserWindow | null = null;
  private currentStatus: SplashMessages;
  private startTime: number = 0;
  private isInitialized: boolean = false;
  private isVisible: boolean = false;
  private hideTimeout: NodeJS.Timeout | null = null;
  private statusCallbacks: SplashStatusCallback[] = [];
  private progressCallbacks: SplashProgressCallback[] = [];
  private completeCallbacks: SplashCompleteCallback[] = [];
  private errorCallbacks: SplashErrorCallback[] = [];

  /**
   * @description Создает экземпляр SplashManager
   * @param config - Конфигурация splash screen
   */
  constructor(config?: Partial<SplashConfig>) {
    this.config = {
      ...DEFAULT_SPLASH_CONFIG,
      ...config,
    };
    this.currentStatus = SPLASH_MESSAGES['INITIALIZING'] || {
      status: 'initializing',
      message: 'Инициализация приложения...',
      progress: 0,
    };
  }

  /**
   * @description Инициализирует SplashManager с главным окном
   * @param mainWindow - Главное окно приложения
   * @returns Promise с результатом инициализации
   */
  async initialize(
    mainWindow: BrowserWindow
  ): Promise<SplashOperationResult<void>> {
    try {
      this.mainWindow = mainWindow;
      this.startTime = Date.now();
      this.isInitialized = true;

      await this.show();

      // Устанавливает начальный статус
      await this.updateStatus(
        SPLASH_MESSAGES['INITIALIZING'] || {
          status: 'initializing',
          message: 'Инициализация приложения...',
          progress: 0,
        }
      );

      console.log('SplashManager успешно инициализирован');

      return {
        success: true,
        status: 'ready',
      };
    } catch (error) {
      console.error('Ошибка инициализации SplashManager:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * @description Показывает splash screen
   * Загружает splash screen HTML в главное окно
   * @returns Promise с результатом операции
   */
  async show(): Promise<SplashOperationResult<void>> {
    if (!this.mainWindow) {
      return {
        success: false,
        error: 'Main window not available',
        status: 'error',
      };
    }

    try {
      // Использует переменную окружения Webpack для загрузки splash screen
      const splashUrl = process.env['MAIN_WINDOW_WEBPACK_ENTRY'];

      if (splashUrl) {
        console.log(
          '🔧 Загружаем splash screen через Webpack entry:',
          splashUrl
        );
        await this.mainWindow.loadURL(splashUrl);
      } else {
        // Fallback на статический файл если переменная не найдена
        const splashPath = `file://${require('path').join(__dirname, '/presentation/splash/index.html')}`;
        console.log(
          '🔧 Fallback: загружаем splash screen из файла:',
          splashPath
        );
        await this.mainWindow.loadURL(splashPath);
      }

      this.isVisible = true;
      console.log('Splash screen показан');

      return {
        success: true,
        status: 'ready',
      };
    } catch (error) {
      console.error('Ошибка показа splash screen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * @description Скрывает splash screen и переключается на основное приложение
   * @returns Promise с результатом операции
   */
  async hide(): Promise<SplashOperationResult<void>> {
    if (!this.mainWindow || !this.isVisible) {
      return {
        success: false,
        error: 'Splash screen not visible',
        status: 'error',
      };
    }

    try {
      // Проверяет минимальное время отображения
      const elapsedTime = Date.now() - this.startTime;
      const remainingTime = Math.max(
        0,
        this.config.minDisplayTime - elapsedTime
      );

      if (remainingTime > 0) {
        // Ждет минимальное время
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      // Отправляет событие скрытия в renderer процесс
      this.mainWindow.webContents.send(SPLASH_IPC_EVENTS.HIDE);

      // Ждет завершения анимации перехода
      await new Promise(resolve =>
        setTimeout(resolve, SPLASH_TIMING.TRANSITION_DURATION)
      );

      // Загружает основное приложение
      await this.loadMainApp();

      this.isVisible = false;
      console.log('Splash screen скрыт, основное приложение загружено');

      return {
        success: true,
        status: 'ready',
      };
    } catch (error) {
      console.error('Ошибка скрытия splash screen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * @description Обновляет статус splash screen
   * @param status - Новый статус для отображения
   * @returns Promise с результатом операции
   */
  async updateStatus(
    status: SplashMessages
  ): Promise<SplashOperationResult<void>> {
    try {
      this.currentStatus = status;

      // Отправляет статус
      if (this.mainWindow && this.isVisible) {
        this.mainWindow.webContents.send(SPLASH_IPC_EVENTS.UPDATE_STATUS, {
          type: SPLASH_IPC_EVENTS.UPDATE_STATUS,
          data: status,
          timestamp: Date.now(),
        });
      }

      // Вызывает callbacks
      this.statusCallbacks.forEach(callback => callback(status));

      console.log(`Splash status обновлен: ${status.message}`);

      return {
        success: true,
        status: status.status,
      };
    } catch (error) {
      console.error('Ошибка обновления статуса splash screen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * @description Устанавливает прогресс инициализации
   * @param progress - Прогресс в процентах (0-100)
   * @returns Promise с результатом операции
   */
  async setProgress(progress: number): Promise<SplashOperationResult<void>> {
    try {
      const clampedProgress = Math.max(0, Math.min(100, progress));

      // Отправляет обновление прогресса в renderer процесс
      if (this.mainWindow && this.isVisible) {
        this.mainWindow.webContents.send(SPLASH_IPC_EVENTS.SET_PROGRESS, {
          type: SPLASH_IPC_EVENTS.SET_PROGRESS,
          data: clampedProgress,
          timestamp: Date.now(),
        });
      }

      // Вызывает callbacks
      this.progressCallbacks.forEach(callback => callback(clampedProgress));

      return {
        success: true,
        status: this.currentStatus.status,
      };
    } catch (error) {
      console.error('Ошибка установки прогресса splash screen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * @description Завершает инициализацию и скрывает splash screen
   * @returns Promise с результатом операции
   */
  async complete(): Promise<SplashOperationResult<void>> {
    try {
      // Обновляет статус на "готово"
      await this.updateStatus(
        SPLASH_MESSAGES['READY'] || {
          status: 'ready',
          message: 'Готово!',
          details: 'Приложение готово к работе',
          progress: 100,
        }
      );

      // Вызывает callbacks завершения
      this.completeCallbacks.forEach(callback => callback());

      // Отправляет событие завершения в renderer процесс
      if (this.mainWindow && this.isVisible) {
        this.mainWindow.webContents.send(SPLASH_IPC_EVENTS.COMPLETE, {
          type: SPLASH_IPC_EVENTS.COMPLETE,
          timestamp: Date.now(),
        });
      }

      // Автоматически скрывает splash screen если настроено
      if (this.config.autoHide) {
        // Использует setTimeout для асинхронного скрытия
        setTimeout(async () => {
          await this.hide();
        }, SPLASH_TIMING.HIDE_DELAY);
      }

      console.log('Инициализация завершена');

      return {
        success: true,
        status: 'ready',
      };
    } catch (error) {
      console.error('Ошибка завершения инициализации:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * @description Обрабатывает ошибку инициализации
   * @param error - Сообщение об ошибке
   * @returns Promise с результатом операции
   */
  async handleError(error: string): Promise<SplashOperationResult<void>> {
    try {
      const errorStatus: SplashMessages = {
        ...(SPLASH_MESSAGES['ERROR'] || {
          status: 'error',
          message: 'Ошибка инициализации',
          details: 'Произошла ошибка при запуске приложения',
          progress: 0,
        }),
        details: error,
      };

      await this.updateStatus(errorStatus);

      // Вызывает callbacks ошибок
      this.errorCallbacks.forEach(callback => callback(error));

      // Отправляет событие ошибки в renderer процесс
      if (this.mainWindow && this.isVisible) {
        this.mainWindow.webContents.send(SPLASH_IPC_EVENTS.ERROR, {
          type: SPLASH_IPC_EVENTS.ERROR,
          data: error,
          timestamp: Date.now(),
        });
      }

      console.error(`Splash error: ${error}`);

      return {
        success: true,
        status: 'error',
      };
    } catch (err) {
      console.error('Ошибка обработки ошибки splash screen:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  /**
   * @description Загружает основное приложение
   * Переключается с splash screen на основное React приложение
   * @returns Promise с результатом операции
   */
  private async loadMainApp(): Promise<void> {
    if (!this.mainWindow) {
      throw new Error('Main window not available');
    }

    const isDev = process.env['NODE_ENV'] === 'development';
    const path = require('path');

    if (isDev) {
      console.log(
        '🔧 Загружаем основное приложение в dev режиме: http://localhost:8000'
      );
      await this.mainWindow.loadURL('http://localhost:8000');
    } else {
      console.log(
        '🔧 Загружаем основное приложение в production режиме:',
        path.join(__dirname, '../react/index.html')
      );
      await this.mainWindow.loadFile(
        path.join(__dirname, '../react/index.html')
      );
    }
  }

  /**
   * @description Получает текущий статус splash screen
   * @returns Текущий статус
   */
  getCurrentStatus(): SplashMessages {
    return { ...this.currentStatus };
  }

  /**
   * @description Очищает ресурсы SplashManager
   * Удаляет все callbacks и сбрасывает состояние
   */
  cleanup(): void {
    this.statusCallbacks = [];
    this.progressCallbacks = [];
    this.completeCallbacks = [];
    this.errorCallbacks = [];

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    this.isInitialized = false;
    this.isVisible = false;
    this.mainWindow = null;

    console.log('SplashManager ресурсы очищены');
  }
}
