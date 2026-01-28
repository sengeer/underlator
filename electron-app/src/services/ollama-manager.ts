/**
 * @module OllamaManager
 * Сервис для управления Ollama через electron-ollama библиотеку и нативными диалогами.
 * Обеспечивает автоматическую установку, запуск и интерактивный выбор режима работы.
 */

import { ElectronOllama } from 'electron-ollama';
import * as path from 'path';
const { app, dialog } = require('electron');
import {
  mainWindow,
  translations,
  isMac,
  isWindows,
  isLinux,
  isDev,
} from '../main';
import { exec } from 'child_process';
import { platform, homedir } from 'os';
import { errorHandler } from '../utils/error-handler';
import type { OperationContext } from '../types/error-handler';

// Типы состояний для навигации по меню
type ActionState = 'main_menu' | 'download_info' | 'exit';

/**
 * @class OllamaManager
 *
 * Менеджер для управления Ollama сервером в Electron main process.
 * Реализует Singleton паттерн.
 */
class OllamaManager {
  private electronOllama: ElectronOllama | null = null;
  private isInitialized: boolean = false;
  private isStarting: boolean = false;
  private isStopping: boolean = false;

  // URL по умолчанию
  private currentOllamaUrl: string = 'http://127.0.0.1:11434';

  private readonly MAX_ATTEMPTS = 2;
  private readonly RETRY_DELAY_MS = 1000;

  /**
   * Инициализирует OllamaManager.
   * Устанавливает базовые пути, но не запускает загрузку автоматически.
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

      this.electronOllama = new ElectronOllama({
        basePath: isDev
          ? app.getPath('userData')
          : path.dirname(app.getPath('exe')),
        directory: 'Ollama Binaries',
      });

      this.isInitialized = true;
      console.log('✅ OllamaManager initialized successfully');
    } catch (error) {
      errorHandler.logError(error, context);
      this.isInitialized = false;
      throw new Error(
        `Failed to initialize the OllamaManager: ${(error as Error).message}`
      );
    }
  }

  /**
   * Основной метод запуска.
   * Проверяет доступность Ollama. Если недоступна — запускает интерактивный сценарий.
   *
   * @returns {Promise<boolean>}
   * true - Ollama запущена или пользователь выбрал "Запустить Underlator" (пропуск).
   * false - Отмена действия или критическая ошибка.
   */
  async startOllama(): Promise<boolean> {
    if (!this.electronOllama) {
      throw new Error(
        'OllamaManager is not initialized. Call initialize() first.'
      );
    }

    if (this.isStarting) {
      console.log('🔄 Ollama is already starting...');
      return false;
    }

    this.isStarting = true;

    try {
      // 1. Быстрая проверка: может быть Ollama уже работает
      const isRunning = await this.isOllamaRunning();
      if (isRunning) {
        console.log(
          `✅ Ollama server is already running at ${this.currentOllamaUrl}`
        );
        return true;
      }

      // 2. Если не работает — запускаем интерактивный флоу
      const success = await this.handleInteractiveStartup();
      return success;
    } catch (error) {
      console.error('❌ Error during Ollama startup flow:', error);
      return await this.showFallbackDialog(
        `Critical error during startup: ${(error as Error).message}`
      );
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Машина состояний для диалогов.
   * Позволяет навигироваться между окнами ("Назад").
   */
  private async handleInteractiveStartup(): Promise<boolean> {
    let action: ActionState = 'main_menu';

    // Цикл работает пока action не станет 'exit'
    // Если пользователь выберет успешный сценарий, метод вернет true внутри цикла
    while (action !== 'exit') {
      if (action === 'main_menu') {
        // Диалог 1: Главное меню выбора
        const { response } = await dialog.showMessageBox({
          type: 'question',
          title: 'Ollama не найдена', // 'Ollama not found'
          message: `Ollama не обнаружена по адресу ${this.currentOllamaUrl}`, // 'Ollama was not found at...'
          // [Download Ollama, Run Underlator, Cancel]
          buttons: ['Загрузить Ollama', 'Запустить Underlator'],
          defaultId: 3,
          cancelId: 1,
        });

        if (response === 0) {
          // Переход к инфо о загрузке
          action = 'download_info';
        } else if (response === 1) {
          // Запустить приложение без Ollama (пропустить проверку)
          console.log(
            '⚠️ User chose to run Underlator without local Ollama check.'
          );
          return true;
        }
      }

      if (action === 'download_info') {
        // Диалог 2: Инфо о путях
        const pathInfo = this.getPlatformSpecificPath();
        const { response } = await dialog.showMessageBox({
          type: 'info',
          title: 'Загрузка Ollama', // 'Downloading Ollama'
          message:
            'Бинарные файлы Ollama будут сохранены в следующую директорию:', // 'Ollama binaries will be saved to:'
          detail: pathInfo,
          // [Download, Back]
          buttons: ['Загрузить', 'Назад'],
          defaultId: 2,
          cancelId: 1,
        });

        if (response === 0) {
          // Запуск скачивания
          return await this.performLocalStart();
        } else {
          // Назад в главное меню
          action = 'main_menu';
        }
      }
    }

    return false;
  }

  /**
   * Возвращает путь хранения бинарников в зависимости от ОС.
   */
  private getPlatformSpecificPath(): string {
    const underlatorDir = 'Underlator';

    if (isMac) {
      return path.join(
        homedir(),
        'Library',
        'Application Support',
        underlatorDir,
        path.sep
      );
    } else if (isLinux) {
      return path.join(homedir(), '.config', underlatorDir, path.sep);
    } else if (isWindows) {
      return path.join(app.getPath('appData'), underlatorDir, path.sep);
    }
    return path.join(app.getPath('userData'), 'Ollama Binaries');
  }

  /**
   * Логика загрузки и запуска локальной версии Ollama.
   */
  private async performLocalStart(): Promise<boolean> {
    let attempt = 0;
    try {
      while (attempt < this.MAX_ATTEMPTS) {
        attempt++;
        console.log(
          `🔄 Attempt ${attempt}/${this.MAX_ATTEMPTS} to start local Ollama...`
        );

        try {
          if (!this.electronOllama) throw new Error('Ollama instance lost');

          const downloadedVersions =
            await this.electronOllama.downloadedVersions();
          let versionToServe: string;

          // Проверка на наличие элементов в массиве и undefined
          if (
            downloadedVersions.length > 0 &&
            downloadedVersions[downloadedVersions.length - 1]
          ) {
            // Гарантируем, что это строка
            versionToServe = downloadedVersions[
              downloadedVersions.length - 1
            ] as string;
            console.log(`✅ Using local Ollama version: ${versionToServe}`);
          } else {
            console.log('🌐 Downloading latest Ollama...');
            const metadata = await this.electronOllama.getMetadata('latest');
            versionToServe = metadata.version || 'latest';
          }

          // as any используется т.к. библиотека ожидает строгий литерал 'vX.X.X', а мы передаем string
          await this.electronOllama.serve(versionToServe as any, {
            serverLog: message => console.log('🔌 [Ollama Server]', message),
            downloadLog: (percent, message) =>
              mainWindow.webContents.send('splash:status-update', {
                status: 'downloading-ollama',
                message:
                  translations.DOWNLOADING_OLLAMA || 'Downloading Ollama...',
                details: this.formatMessage(message),
                progress: percent,
              }),
            timeoutSec: 3,
          });

          this.currentOllamaUrl = 'http://127.0.0.1:11434';
          process.env['OLLAMA_HOST'] = this.currentOllamaUrl;

          console.log('✅ Local Ollama server started successfully');
          return true;
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);

          const isNetworkError =
            error instanceof Error &&
            (error.message.includes('fetch') ||
              error.message.includes('network'));

          if (isNetworkError && attempt >= this.MAX_ATTEMPTS) {
            throw error;
          }

          await new Promise(r => setTimeout(r, this.RETRY_DELAY_MS));
        }
      }
    } catch (e) {
      this.showFallbackDialog((e as Error).message);
    }
    return false;
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

  private async showFallbackDialog(error: string): Promise<boolean> {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      title: 'Ollama недоступна', // 'Ollama unavailable'
      message:
        'Underlator не смог загрузить бинарники Ollama в автоматическом режиме.', // 'Underlator failed to load Ollama binaries...'
      detail: error,
      // [Start without Ollama]
      buttons: ['Запустить без Ollama'],
      defaultId: 1,
      cancelId: 0,
    });
    return response === 0;
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
      console.log('OllamaManager is not initialized');
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
      console.error('Error stopping the Ollama server gracefully:', error);
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
      console.error('Error checking the Ollama server status:', error);
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
      console.error('Error during OllamaManager cleanup:', error);
    }
  }
}

// Экспорт синглтона для использования в приложении
export const ollamaManager = new OllamaManager();
export default ollamaManager;
