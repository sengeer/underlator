/**
 * @module OllamaManager
 * @description Сервис для управления Ollama через electron-ollama библиотеку
 * Обеспечивает автоматическую установку, запуск и остановку Ollama сервера
 * Реализует fallback логику для обработки ошибок и восстановления работоспособности
 */

import { ElectronOllama } from 'electron-ollama';
import { app } from 'electron';

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
      console.log('OllamaManager уже инициализирован');
      return;
    }

    try {
      console.log('Инициализация OllamaManager...');

      // Создание экземпляра ElectronOllama с базовым путем
      this.electronOllama = new ElectronOllama({
        basePath: app.getPath('userData'),
        directory: 'ollama-binaries',
      });

      this.isInitialized = true;
      console.log('OllamaManager успешно инициализирован');
    } catch (error) {
      console.error('Ошибка инициализации OllamaManager:', error);
      this.isInitialized = false;
      throw new Error(
        `Не удалось инициализировать OllamaManager: ${(error as Error).message}`
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
        'OllamaManager не инициализирован. Вызовите initialize() сначала.'
      );
    }

    if (this.isStarting) {
      console.log('Ollama уже запускается...');
      return false;
    }

    try {
      this.isStarting = true;
      console.log('Запуск Ollama сервера...');

      // Проверка текущего статуса сервера
      const isRunning = await this.isOllamaRunning();
      if (isRunning) {
        console.log('Ollama сервер уже запущен');
        return false;
      }

      // Получение метаданных последней версии Ollama
      const metadata = await this.electronOllama.getMetadata('latest');

      // Запуск сервера с автоматической загрузкой при необходимости
      await this.electronOllama.serve(metadata.version, {
        serverLog: (message) => console.log('[Ollama Server]', message),
        downloadLog: (percent, message) =>
          console.log('[Ollama Download]', `${percent}%`, message),
        timeoutSec: 30,
      });

      console.log('Ollama сервер успешно запущен');
      return true;
    } catch (error) {
      console.error('Ошибка запуска Ollama сервера:', error);
      throw new Error(
        `Не удалось запустить Ollama сервер: ${(error as Error).message}`
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
      console.log('OllamaManager не инициализирован');
      return false;
    }

    if (this.isStopping) {
      console.log('Ollama уже останавливается...');
      return false;
    }

    try {
      this.isStopping = true;
      console.log('Остановка Ollama сервера...');

      // Проверка текущего статуса сервера
      const isRunning = await this.isOllamaRunning();
      if (!isRunning) {
        console.log('Ollama сервер уже остановлен');
        return false;
      }

      // Безопасная остановка сервера через getServer()
      const server = this.electronOllama.getServer();
      if (server) {
        await server.stop();
      }

      console.log('Ollama сервер успешно остановлен');
      return true;
    } catch (error) {
      console.error('Ошибка остановки Ollama сервера:', error);
      throw new Error(
        `Не удалось остановить Ollama сервер: ${(error as Error).message}`
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
      console.warn('Ошибка проверки статуса Ollama сервера:', error);
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
      console.log('OllamaManager ресурсы очищены');
    } catch (error) {
      console.error('Ошибка очистки ресурсов OllamaManager:', error);
    }
  }
}

// Экспорт синглтона для использования в приложении
export const ollamaManager = new OllamaManager();
export default ollamaManager;
