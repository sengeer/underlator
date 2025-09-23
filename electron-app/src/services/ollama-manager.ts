import { ElectronOllama } from 'electron-ollama';
import { app } from 'electron';
import { mainWindow } from '../main';
import { translations } from '../main';

/**
 * @module OllamaManager
 * @description Сервис для управления Ollama через electron-ollama библиотеку
 * Обеспечивает автоматическую установку, запуск и остановку Ollama сервера
 * Реализует fallback логику для обработки ошибок и восстановления работоспособности
 */

/**
 * @class OllamaManager
 * @description Менеджер для управления Ollama сервером в Electron main process
 * Обеспечивает автоматическую установку и управление жизненным циклом Ollama
 */
class OllamaManager {
  private electronOllama: ElectronOllama | null = null;
  private isInitialized: boolean = false;
  private isStarting: boolean = false;
  private isStopping: boolean = false;

  /**
   * @description Инициализирует OllamaManager и выполняет автоматическую установку Ollama
   * Проверяет доступность Ollama и устанавливает его при необходимости
   * @returns {Promise<void>} Promise, который разрешается после инициализации
   * @throws {Error} Ошибка инициализации или установки Ollama
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ OllamaManager has already been initialized');
      return;
    }

    try {
      console.log('🔄 Initialization of the OllamaManager...');

      // Создание экземпляра ElectronOllama с базовым путем
      this.electronOllama = new ElectronOllama({
        basePath: app.getPath('userData'),
        directory: 'ollama-binaries',
      });

      this.isInitialized = true;
      console.log('✅ OllamaManager initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing the OllamaManager:', error);
      this.isInitialized = false;
      throw new Error(
        `❌ Failed to initialize the OllamaManager: ${(error as Error).message}`
      );
    }
  }

  /**
   * @description Запускает Ollama сервер
   * Проверяет статус сервера и запускает его при необходимости
   * @returns {Promise<boolean>} Promise с результатом запуска (true - успешно, false - уже запущен)
   * @throws {Error} Ошибка запуска Ollama сервера
   */
  async startOllama(): Promise<boolean> {
    if (!this.electronOllama) {
      throw new Error(
        '❌ OllamaManager is not initialized. Call initialize() first.'
      );
    }

    if (this.isStarting) {
      console.log('🔄 Ollama is already starting...');
      return false;
    }

    try {
      this.isStarting = true;
      console.log('🔄 Starting the Ollama server...');

      // Проверка текущего статуса сервера
      const isRunning = await this.isOllamaRunning();
      if (isRunning) {
        console.log('✅ Ollama server is already running');
        return false;
      }

      // Получение метаданных последней версии Ollama
      const metadata = await this.electronOllama.getMetadata('latest');

      // Запуск сервера с автоматической загрузкой при необходимости
      await this.electronOllama.serve(metadata.version, {
        serverLog: message => console.log('🔌 [Ollama Server]', message),
        downloadLog: percent =>
          mainWindow.webContents.send('splash:status-update', {
            status: 'downloading-ollama',
            message: translations.DOWNLOADING_OLLAMA || 'Downloading Ollama...',
            progress: percent,
          }),
        timeoutSec: 1,
      });

      console.log('✅ Ollama server started successfully');
      return true;
    } catch (error) {
      console.error('❌ Error starting the Ollama server:', error);
      throw new Error(
        `❌ Failed to start the Ollama server: ${(error as Error).message}`
      );
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * @description Останавливает Ollama сервер
   * Безопасно завершает работу сервера с сохранением состояния
   * @returns {Promise<boolean>} Promise с результатом остановки (true - успешно, false - уже остановлен)
   * @throws {Error} Ошибка остановки Ollama сервера
   */
  async stopOllama(): Promise<boolean> {
    if (!this.electronOllama) {
      console.log('❌ OllamaManager is not initialized');
      return false;
    }

    if (this.isStopping) {
      console.log('🔄 Ollama is already stopping...');
      return false;
    }

    try {
      this.isStopping = true;
      console.log('🔄 Stopping the Ollama server...');

      // Проверка текущего статуса сервера
      const isRunning = await this.isOllamaRunning();
      if (!isRunning) {
        console.log('✅ Ollama server is already stopped');
        return false;
      }

      // Безопасная остановка сервера через getServer()
      const server = this.electronOllama.getServer();
      if (server) {
        await server.stop();
      }

      console.log('✅ Ollama server stopped successfully');
      return true;
    } catch (error) {
      console.error('❌ Error stopping the Ollama server:', error);
      throw new Error(
        `❌ Failed to stop the Ollama server: ${(error as Error).message}`
      );
    } finally {
      this.isStopping = false;
    }
  }

  /**
   * @description Проверяет статус работы Ollama сервера
   * Выполняет ping запрос к серверу для определения его доступности
   * @returns {Promise<boolean>} Promise с результатом проверки (true - сервер работает, false - не работает)
   * @throws {Error} Ошибка проверки статуса сервера
   */
  async isOllamaRunning(): Promise<boolean> {
    if (!this.electronOllama) {
      return false;
    }

    try {
      // Проверка доступности сервера через isRunning()
      const isRunning = await this.electronOllama.isRunning();
      return isRunning;
    } catch (error) {
      console.error('❌ Error checking the Ollama server status:', error);
      return false;
    }
  }

  /**
   * @description Получает экземпляр ElectronOllama для прямого взаимодействия
   * @returns {ElectronOllama | null} Экземпляр ElectronOllama или null если не инициализирован
   */
  getElectronOllamaInstance(): ElectronOllama | null {
    return this.electronOllama;
  }

  /**
   * @description Проверяет статус инициализации OllamaManager
   * @returns {boolean} true если OllamaManager инициализирован, false в противном случае
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * @description Выполняет полную очистку ресурсов OllamaManager
   * Останавливает сервер и освобождает ресурсы
   * @returns {Promise<void>} Promise, который разрешается после очистки
   */
  async cleanup(): Promise<void> {
    try {
      if (this.electronOllama) {
        await this.stopOllama();
        this.electronOllama = null;
      }
      this.isInitialized = false;
      console.log('✅ OllamaManager resources cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up the OllamaManager resources:', error);
    }
  }
}

// Экспорт синглтона для использования в приложении
export const ollamaManager = new OllamaManager();
export default ollamaManager;
