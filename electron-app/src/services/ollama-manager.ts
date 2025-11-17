/**
 * @module OllamaManager
 * Сервис для управления Ollama через electron-ollama библиотеку.
 * Обеспечивает автоматическую установку, запуск и остановку Ollama сервера.
 * Реализует fallback логику для обработки ошибок и восстановления работоспособности.
 */

import { ElectronOllama } from 'electron-ollama';
const path = require('path');
import { app } from 'electron';
import { mainWindow } from '../main';
import { exec } from 'child_process';
import { platform } from 'os';
import { translations } from '../main';
import { isDev } from '../main';
import { errorHandler } from '../utils/error-handler';
import type { OperationContext } from '../types/error-handler';

/**
 * @class OllamaManager.
 *
 * Менеджер для управления Ollama сервером в Electron main process.
 * Обеспечивает автоматическую установку и управление жизненным циклом Ollama.
 */
class OllamaManager {
  private electronOllama: ElectronOllama | null = null;
  private isInitialized: boolean = false;
  private isStarting: boolean = false;
  private isStopping: boolean = false;
  private MAX_ATTEMPTS = 60;
  private RETRY_DELAY_MS = 1000;

  /**
   * Инициализирует OllamaManager и выполняет автоматическую установку Ollama.
   * Проверяет доступность Ollama и устанавливает его при необходимости.
   *
   * @returns {Promise<void>} Promise, который разрешается после инициализации.
   * @throws {Error} Ошибка инициализации или установки Ollama.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ OllamaManager has already been initialized');
      return;
    }

    const context: OperationContext = {
      module: 'OllamaManager',
      operation: 'initialize',
    };

    try {
      console.log('🔄 Initialization of the OllamaManager...');

      // Создание экземпляра ElectronOllama
      this.electronOllama = new ElectronOllama({
        basePath: isDev
          ? app.getPath('userData')
          : path.dirname(app.getPath('exe')),
        directory: 'ollama-binaries',
      });

      this.isInitialized = true;
      console.log('✅ OllamaManager initialized successfully');
    } catch (error) {
      errorHandler.logError(error, context);
      this.isInitialized = false;
      throw new Error(
        `❌ Failed to initialize the OllamaManager: ${(error as Error).message}`
      );
    }
  }

  /**
   * Форматирует сообщение.
   *
   * @param {string} msg - Сообщение для форматирования.
   * @returns {string} Форматированное сообщение.
   */
  private formatMessage(msg: string) {
    // Строка в формате:
    // Downloading archive.zip (0MB / 0MB) 100%
    // Делится на массив
    const msgParts = msg.split(' ');

    // Выбирает 1 по 5 строку
    const selectedParts = msgParts.slice(1, 5);

    // Соединяет 1 по 5 строку:
    // archive.zip (0MB / 0MB)
    if (selectedParts) return selectedParts.join(' ');

    return '';
  }

  /**
   * Запускает Ollama сервер.
   * Проверяет статус сервера и запускает его при необходимости.
   * Поддерживает офлайн режим - сначала проверяет локальные версии Ollama.
   *
   * @returns {Promise<boolean>} Promise с результатом запуска (true - успешно, false - уже запущен).
   * @throws {Error} Ошибка запуска Ollama сервера.
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

    let attempt = 0;
    this.isStarting = true;

    try {
      // Повторяет попытку запуска Ollama сервера MAX_ATTEMPTS раз
      while (attempt < this.MAX_ATTEMPTS) {
        attempt++;
        console.log(
          `🔄 Attempt ${attempt}/${this.MAX_ATTEMPTS} to start Ollama server...`
        );

        try {
          // Проверка текущего статуса сервера
          const isRunning = await this.isOllamaRunning();
          if (isRunning) {
            console.log('✅ Ollama server is already running');
            return false;
          }

          // Сначала проверяет доступные версии Ollama
          const downloadedVersions =
            await this.electronOllama.downloadedVersions();
          console.log(
            '📦 Available local Ollama versions:',
            downloadedVersions
          );

          let versionToServe: any;

          if (downloadedVersions.length > 0) {
            // Использует последнюю доступную версию
            const lastVersion =
              downloadedVersions[downloadedVersions.length - 1];
            if (lastVersion) {
              versionToServe = lastVersion;
              console.log(`✅ Using local Ollama version: ${versionToServe}`);
            } else {
              throw new Error('❌ Invalid local version found');
            }
          } else {
            // Если локальных версий нет, пытаемся получить метаданные из интернета
            console.log(
              '🌐 No local versions found, attempting to download latest...'
            );
            const metadata = await this.electronOllama.getMetadata('latest');
            versionToServe = metadata.version;
          }

          // Запуск сервера с автоматической загрузкой при необходимости
          await this.electronOllama.serve(versionToServe, {
            serverLog: message => console.log('🔌 [Ollama Server]', message),
            downloadLog: (percent, message) =>
              mainWindow.webContents.send('splash:status-update', {
                status: 'downloading-ollama',
                message:
                  translations.DOWNLOADING_OLLAMA || 'Downloading Ollama...',
                details: this.formatMessage(message),
                progress: percent,
              }),
            timeoutSec: 1,
          });

          console.log('✅ Ollama server started successfully');
          return true;
        } catch (error) {
          console.error(`❌ Attempt ${attempt} failed:`, error);

          // Проверяет, является ли ошибка из-за отсутствия интернета
          const isNetworkError =
            error instanceof Error &&
            (error.message.includes('fetch') ||
              error.message.includes('network') ||
              error.message.includes('ECONNREFUSED') ||
              error.message.includes('ENOTFOUND'));

          if (isNetworkError) {
            console.warn(
              '🌐 Network error detected, checking for local Ollama versions...'
            );

            try {
              // Проверяет, есть ли локальные версии для запуска
              const downloadedVersions =
                await this.electronOllama.downloadedVersions();

              if (downloadedVersions.length > 0) {
                console.log(
                  '✅ Found local versions, retrying with local Ollama...'
                );
                // Продолжает попытки запуска с локальными версиями
              } else {
                console.warn(
                  '⚠️ No local Ollama versions available and no internet connection'
                );
                // Если нет локальных версий и нет интернета, бросает ошибку
                throw new Error(
                  '❌ No local Ollama versions available and no internet connection. Please install Ollama manually or connect to the internet.'
                );
              }
            } catch (localCheckError) {
              console.error(
                '❌ Error checking local versions:',
                localCheckError
              );
              throw new Error(
                '❌ Failed to start Ollama: no local versions available and no internet connection'
              );
            }
          }

          // Если это последняя попытка - пробрасывает ошибку дальше
          if (attempt >= this.MAX_ATTEMPTS) {
            throw new Error(
              `❌ Failed to start Ollama server after ${this.MAX_ATTEMPTS} attempts: ${(error as Error).message}`
            );
          }

          // Ожидает перед следующей попыткой
          console.log(`⏳ Retrying in ${this.RETRY_DELAY_MS}ms...`);
          await new Promise(resolve =>
            setTimeout(resolve, this.RETRY_DELAY_MS)
          );
        }
      }

      return false;
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Останавливает Ollama сервер.
   * Безопасно завершает работу сервера с сохранением состояния.
   *
   * @returns {Promise<boolean>} Promise с результатом остановки (true - успешно, false - уже остановлен).
   * @throws {Error} Ошибка остановки Ollama сервера.
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
      console.log('🔄 Stopping the Ollama server (graceful)...');

      const server = this.electronOllama.getServer();
      if (server) {
        await server.stop();
      }

      console.log('✅ Ollama server stopped gracefully');
      return true;
    } catch (error) {
      console.error('❌ Error stopping the Ollama server gracefully:', error);
      // НЕ пробрасываем ошибку, просто сообщаем о неудаче.
      // Cleanup должен продолжиться в любом случае.
      return false;
    } finally {
      this.isStopping = false;
    }
  }

  /**
   * Проверяет статус работы Ollama сервера.
   * Выполняет ping запрос к серверу для определения его доступности.
   *
   * @returns {Promise<boolean>} Promise с результатом проверки (true - сервер работает, false - не работает).
   * @throws {Error} Ошибка проверки статуса сервера.
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
   * Получает экземпляр ElectronOllama для прямого взаимодействия.
   *
   * @returns {ElectronOllama | null} Экземпляр ElectronOllama или null если не инициализирован.
   */
  getElectronOllamaInstance(): ElectronOllama | null {
    return this.electronOllama;
  }

  /**
   * Проверяет статус инициализации OllamaManager.
   *
   * @returns {boolean} true если OllamaManager инициализирован, false в противном случае.
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Принудительно завершает все процессы "ollama" - по имени.
   * Используется для гарантированной очистки при выходе из приложения.
   *
   * @returns {Promise<void>}
   */
  private killAllOllamaProcesses(): Promise<void> {
    return new Promise(resolve => {
      const osPlatform = platform();
      let command: string;

      if (osPlatform === 'win32') {
        // Для Windows:
        // /F - принудительное завершение
        // /IM - завершить процесс по имени образа (ollama.exe)
        command = 'taskkill /F /IM ollama.exe';
      } else {
        // Для macOS и Linux:
        // pkill -9 -f ollama
        // -9 - SIGKILL (принудительно, без компромиссов)
        // -f - искать по всей командной строке (надежнее, чем просто по имени 'ollama')
        command = 'pkill -9 -f ollama';
      }

      console.log(`[Exec] Running cleanup command: ${command}`);
      exec(command, (error, stdout, stderr) => {
        if (error) {
          // Ошибка "не найдено" - это нормально, значит, их и не было.
          if (
            stderr &&
            !stderr.includes('No matching processes') && // Linux/macOS
            !stderr.includes('не найден') && // Windows (ru)
            !stderr.includes('not found') && // Windows (en)
            !stderr.includes('Не найдено') // Windows (ru)
          ) {
            console.warn(
              `⚠️ Error executing pkill/taskkill by name: ${stderr}`
            );
          }
        }
        console.log(
          `[Exec] ${stdout || 'Process kill by name command executed.'}`
        );
        resolve();
      });
    });
  }

  /**
   * Выполняет полную очистку ресурсов OllamaManager.
   * Останавливает сервер и принудительно убивает все дочерние процессы.
   *
   * @returns {Promise<void>} Promise, который разрешается после очистки.
   */
  async cleanup(): Promise<void> {
    console.log('🔄 Starting OllamaManager cleanup...');
    try {
      // Попытка штатной остановки (может не убить дочерние процессы)
      if (this.electronOllama) {
        try {
          console.log('Attempting graceful stop...');
          await this.stopOllama();
        } catch (stopError) {
          console.warn(
            `⚠️ Graceful stop failed (this is often expected): ${
              (stopError as Error).message
            }`
          );
        }
      }

      // Принудительное завершение ВСЕХ процессов Ollama по имени.
      // Решает проблему "зомби" процессов.
      console.log(
        '🧹 Forcibly cleaning up any remaining "ollama" processes...'
      );
      await this.killAllOllamaProcesses();

      this.electronOllama = null;
      this.isInitialized = false;
      console.log('✅ OllamaManager resources cleaned up successfully');
    } catch (error) {
      console.error('❌ Error during OllamaManager cleanup:', error);
    }
  }
}

// Экспорт синглтона для использования в приложении
export const ollamaManager = new OllamaManager();
export default ollamaManager;
