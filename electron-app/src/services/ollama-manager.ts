/**
 * @module OllamaManager
 * Сервис для управления Ollama через библиотеку electron-ollama.
 *
 * Обеспечивает автоматическую установку, запуск и остановку Ollama сервера.
 * Реализует fallback логику и интерактивные диалоги для взаимодействия с пользователем.
 */

import { ElectronOllama } from 'electron-ollama';
const path = require('path');
const { app, dialog } = require('electron');
import { mainWindow } from '../main';
import { exec } from 'child_process';
import { platform } from 'os';
import { translations, waitForTranslations } from '../main';
import { errorHandler } from '../utils/error-handler';
import type { OperationContext } from '../types/error-handler';

/**
 * @class OllamaManager
 *
 * Менеджер для управления Ollama сервером в Electron main process.
 * Обеспечивает автоматическую установку и управление жизненным циклом Ollama.
 */
class OllamaManager {
  private electronOllama: ElectronOllama | null = null;
  private isInitialized: boolean = false;
  private isStarting: boolean = false;
  private isStopping: boolean = false;
  private MAX_ATTEMPTS = 2;
  private RETRY_DELAY_MS = 1000;
  private readonly currentOllamaUrl = 'http://127.0.0.1:11434';

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
        basePath: app.getPath('userData'),
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
   * Возвращает путь установки бинарников Ollama для отображения пользователю.
   *
   * @returns {string} Путь к директории.
   */
  private getBinaryPathDisplay(): string {
    return path.join(app.getPath('userData'), 'Ollama Binaries');
  }

  /**
   * Показывает диалоговое окно, когда Ollama не найдена (ни сервис, ни бинарники).
   * Метод ожидает загрузки переводов из Main процесса перед отображением,
   * чтобы гарантировать корректный язык интерфейса при холодном старте.
   *
   * @returns {Promise<number>} Индекс нажатой кнопки (0 - Загрузить, 1 - Запустить Underlator).
   */
  private async showNotFoundDialog(): Promise<number> {
    await waitForTranslations();

    const { response } = await dialog.showMessageBox({
      type: 'question',
      title:
        translations['OLLAMA_NOT_FOUND_DIALOG_TITLE'] || 'Ollama not found',
      message: `${
        translations['OLLAMA_NOT_FOUND_DIALOG_MESSAGE_1'] ||
        'Ollama was not found at'
      } ${this.currentOllamaUrl} ${
        translations['OLLAMA_NOT_FOUND_DIALOG_MESSAGE_2'] ||
        'and no local binaries were found'
      }`,
      buttons: [
        translations['OLLAMA_NOT_FOUND_DIALOG_DOWNLOAD_BUTTON'] ||
          'Download Ollama',
        translations['DIALOG_RUN_BUTTON'] || 'Run Underlator',
      ],
      defaultId: 1,
      cancelId: 1,
    });
    return response;
  }

  /**
   * Показывает диалоговое окно с информацией о загрузке.
   *
   * @returns {Promise<number>} Индекс нажатой кнопки (0 - Загрузить, 1 - Назад).
   */
  private async showDownloadInfoDialog(): Promise<number> {
    const pathInfo = this.getBinaryPathDisplay();
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title:
        translations['DOWNLOADING_OLLAMA_DIALOG_TITLE'] || 'Downloading Ollama',
      message: `${
        translations['DOWNLOADING_OLLAMA_DIALOG_MESSAGE'] ||
        'Ollama binaries will be saved to:'
      } ${pathInfo}`,
      buttons: [
        translations['DOWNLOADING_OLLAMA_DIALOG_DOWNLOAD_BUTTON'] || 'Download',
        translations['DOWNLOADING_OLLAMA_DIALOG_BACK_BUTTON'] || 'Back',
      ],
      defaultId: 2,
      cancelId: 1,
    });
    return response;
  }

  /**
   * Показывает диалоговое окно ошибки при невозможности загрузить/запустить Ollama.
   *
   * @param {string} errorDetails - Текст ошибки.
   * @returns {Promise<void>}
   */
  private async showFatalErrorDialog(errorDetails: string): Promise<void> {
    await dialog.showMessageBox({
      type: 'question',
      title:
        translations['OLLAMA_UNAVAILABLE_DIALOG_TITLE'] || 'Ollama unavailable',
      message: `${
        translations['OLLAMA_UNAVAILABLE_DIALOG_MESSAGE'] ||
        'Underlator failed to load Ollama binaries:'
      } ${errorDetails}`,
      buttons: [translations['DIALOG_RUN_BUTTON'] || 'Run Underlator'],
      defaultId: 3,
      cancelId: 0,
    });
  }

  /**
   * Внутренний метод для выполнения цикла запуска/загрузки.
   * Инкапсулирует логику повторных попыток и выбора версии.
   *
   * @returns {Promise<boolean>} Успешность запуска.
   */
  private async performStartupSequence(): Promise<boolean> {
    if (!this.electronOllama) return false;

    let attempt = 0;
    while (attempt < this.MAX_ATTEMPTS) {
      attempt++;
      console.log(
        `🔄 Attempt ${attempt}/${this.MAX_ATTEMPTS} to start Ollama server...`
      );

      try {
        // Сначала проверяет доступные версии Ollama
        const downloadedVersions =
          await this.electronOllama.downloadedVersions();
        console.log('📦 Available local Ollama versions:', downloadedVersions);

        let versionToServe: any;

        if (downloadedVersions.length > 0) {
          // Использует последнюю доступную версию
          const lastVersion = downloadedVersions[downloadedVersions.length - 1];
          if (lastVersion) {
            versionToServe = lastVersion;
            console.log(`✅ Using local Ollama version: ${versionToServe}`);
          } else {
            throw new Error('Invalid local version found');
          }
        } else {
          // Если локальных версий нет, пытается получить метаданные из интернета
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
                translations['DOWNLOADING_OLLAMA'] || 'Downloading Ollama...',
              details: this.formatMessage(message),
              progress: percent,
            }),
          timeoutSec: 1,
        });

        console.log('✅ Ollama server started successfully');
        return true;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        const errorMessage = (error as Error).message;

        const isNetworkError =
          errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND');

        // Если это последняя попытка - показывает диалог ошибки
        if (attempt >= this.MAX_ATTEMPTS) {
          await this.showFatalErrorDialog(errorMessage);
          return false;
        }

        if (isNetworkError) {
          try {
            // Проверяет, есть ли локальные версии, чтобы попробовать еще раз без сети
            const downloadedVersions =
              await this.electronOllama.downloadedVersions();
            if (downloadedVersions.length === 0) {
              // Нет локальных версий и нет сети -> сразу показывает ошибку
              await this.showFatalErrorDialog(
                'No internet connection and no local Ollama versions found.'
              );
              return false;
            }
            // Если версии есть, цикл продолжится и попробует запустить их
          } catch (localCheckError) {
            await this.showFatalErrorDialog(
              `Failed to check local versions: ${(localCheckError as Error).message}`
            );
            return false;
          }
        }

        console.log(`⏳ Retrying in ${this.RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
      }
    }

    return false;
  }

  /**
   * Запускает Ollama сервер с интерактивным взаимодействием.
   *
   * Логика принятия решений:
   * 1. Если сервис Ollama уже работает -> успех (независимо от бинарников).
   * 2. Если есть локальные бинарники -> автоматический запуск (без диалогов).
   * 3. Если ничего нет -> показываем диалог с предложением загрузить.
   *
   * @returns {Promise<boolean>} Promise с результатом запуска (true - успешно запущено, false - работа без Ollama).
   * @throws {Error} Ошибка инициализации.
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
      // Проверка текущего статуса сервера
      // Если пользователь запустил вручную, неважно есть ли у нас бинарники
      const isRunning = await this.isOllamaRunning();
      if (isRunning) {
        console.log('✅ Ollama server is already running');
        return true; // Важно: возвращает true, так как сервис доступен
      }

      // Проверка наличия локальных бинарников
      // Если бинарники есть, но сервер не запущен -> автостарт без вопросов
      const downloadedVersions = await this.electronOllama.downloadedVersions();
      const hasLocalBinaries = downloadedVersions.length > 0;

      if (hasLocalBinaries) {
        console.log('✅ Local binaries found. Auto-starting Ollama...');
        return await this.performStartupSequence();
      }

      // Бинарников нет и сервер не работает
      // Запускаем интерактивный цикл
      let userDecisionMade = false;
      let shouldDownload = false;

      while (!userDecisionMade) {
        // Диалог 1: Ollama не найдена
        const initialResponse = await this.showNotFoundDialog();

        if (initialResponse === 1) {
          // Пользователь выбрал "Запустить Underlator" (без Ollama)
          console.log('User chose to run without Ollama.');
          return false;
        } else {
          // Пользователь выбрал "Загрузить Ollama" -> Диалог 2
          const downloadResponse = await this.showDownloadInfoDialog();

          if (downloadResponse === 1) {
            // Пользователь выбрал "Назад", цикл повторяется
            continue;
          } else {
            // Пользователь выбрал "Загрузить"
            shouldDownload = true;
            userDecisionMade = true;
          }
        }
      }

      if (shouldDownload) {
        // Запускает попытку загрузки и старта
        return await this.performStartupSequence();
      }

      return false;
    } catch (unexpectedError) {
      console.error('Unexpected error in startOllama:', unexpectedError);
      await this.showFatalErrorDialog((unexpectedError as Error).message);
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
      // Сообщает о неудаче без проброса ошибки
      // Cleanup должен продолжиться в любом случае
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
