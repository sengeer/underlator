const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');
const ModelDownloader = require('./services/model-downloader');
import { ollamaManager } from './services/ollama-manager';
import { OllamaApi } from './services/ollama-api';
import type {
  MenuTranslations,
  TransformersArgs,
  WorkerStatus,
  ModelAvailability,
  ModelOperationResult,
  AvailableModels,
  OllamaGenerateRequest,
  OllamaPullRequest,
  OllamaDeleteRequest,
} from './types';

if (require('electron-squirrel-startup')) {
  app.quit();
}

/**
 * Определяет development режим
 * В Electron Forge с webpack NODE_ENV корректно передается через cross-env
 */
const isDev: boolean = process.env['NODE_ENV'] === 'development';
console.log('🔧 NODE_ENV:', process.env['NODE_ENV']);

let worker: typeof Worker | null = null;
let mainWindow: typeof BrowserWindow | null = null;
let isHandlerRegistered: boolean = false;
let ollamaApi: OllamaApi | null = null;
const isMac: boolean = process.platform === 'darwin';
const isWindows: boolean = process.platform === 'win32';

let translations: MenuTranslations = {};

/**
 * Инициализирует Ollama и создает API клиент
 * Выполняется при старте приложения для подготовки Ollama к работе
 */
async function initializeOllama(): Promise<void> {
  try {
    console.log('Инициализация Ollama...');

    // Инициализирует OllamaManager
    await ollamaManager.initialize();

    // Запускает Ollama сервер
    const isStarted = await ollamaManager.startOllama();

    if (isStarted) {
      console.log('Ollama сервер успешно запущен');
    } else {
      console.log('Ollama сервер уже был запущен');
    }

    // Создает API клиент для взаимодействия с Ollama
    ollamaApi = new OllamaApi();

    // Проверяет доступность сервера
    const isHealthy = await ollamaApi.healthCheck();
    if (isHealthy) {
      console.log('Ollama API доступен');
    } else {
      console.warn('Ollama API недоступен, но сервер запущен');
    }
  } catch (error) {
    console.error('Ошибка инициализации Ollama:', error);
    throw new Error(
      `Не удалось инициализировать Ollama: ${(error as Error).message}`
    );
  }
}

/**
 * Обработчик обновления переводов меню
 * Получает новые переводы от renderer процесса и перестраивает меню
 */
ipcMain.on(
  'update-translations',
  (_event: any, newTranslations: MenuTranslations) => {
    translations = newTranslations;
    buildMenu();
  }
);

/**
 * Строит кросс-платформенное меню приложения
 * Учитывает особенности macOS и Windows для корректного отображения
 */
function buildMenu(): void {
  // Шаблон кросс-платформенного меню
  const template: any[] = [
    {
      label: translations.menu || 'Menu',
      submenu: [
        {
          role: 'about',
          label: translations.about || 'About',
        },
        { role: 'undo', label: translations.undo || 'Undo' },
        { role: 'redo', label: translations.redo || 'Redo' },
        { role: 'cut', label: translations.cut || 'Cut' },
        { role: 'copy', label: translations.copy || 'Copy' },
        { role: 'paste', label: translations.paste || 'Paste' },
        { role: 'selectall', label: translations.selectAll || 'Select All' },
        { role: 'toggleDevTools', visible: isDev },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);

  // Установка меню в зависимости от платформы
  if (isMac) {
    // Для macOS
    Menu.setApplicationMenu(menu);
  } else {
    // Для Windows и других платформ
    if (mainWindow) {
      mainWindow.setMenu(menu);
    }
  }
}

/**
 * Создает главное окно приложения
 * Настраивает размеры, иконки и webPreferences
 */
function createWindow(): void {
  buildMenu();

  // Создание браузерного окна
  mainWindow = new BrowserWindow({
    width: 480,
    height: 350,
    minWidth: 480,
    minHeight: 350,
    icon: path.join(__dirname, '../icons', isWindows ? 'icon.ico' : ''),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    console.log('🔧 Загружаем URL в dev режиме: http://localhost:8000');
    mainWindow.loadURL('http://localhost:8000');
  } else {
    console.log(
      '🔧 Загружаем файл в production режиме:',
      path.join(__dirname, '../react/index.html')
    );
    mainWindow.loadFile(path.join(__dirname, '../react/index.html'));
  }

  // Явное удаление обработчиков при закрытии окна
  mainWindow.on('closed', () => {
    // Удаляет старые обработчики
    ipcMain.removeHandler('transformers:run');
    ipcMain.removeHandler('models:check-availability');
    ipcMain.removeHandler('models:download');
    ipcMain.removeHandler('models:get-available');
    ipcMain.removeHandler('models:delete');

    // Удаляет новые Ollama обработчики
    ipcMain.removeHandler('ollama:generate');
    ipcMain.removeHandler('models:install');
    ipcMain.removeHandler('models:remove');
    ipcMain.removeHandler('models:list');

    isHandlerRegistered = false;

    if (worker) {
      worker.terminate();
      worker = null;
    }

    mainWindow = null;
  });

  // Проверка на повторный вызов воркера
  let isWorkerBusy: boolean = false;

  // Добавление обработчика для события `transformers:run`
  if (!isHandlerRegistered) {
    ipcMain.handle(
      'transformers:run',
      (_event: any, args: TransformersArgs) => {
        return new Promise((resolve, reject) => {
          if (isWorkerBusy) {
            reject(new Error('Worker is busy'));
            return;
          }

          if (!worker) {
            worker = new Worker(path.join(__dirname, 'worker.js'));
          }

          isWorkerBusy = true;

          // Удаление всех предыдущих слушателей сообщений
          worker.removeAllListeners('message');

          worker.on('message', (message: WorkerStatus) => {
            mainWindow?.webContents.send('transformers:status', message);
            if (message.status === 'complete') {
              resolve(message.data);
              isWorkerBusy = false;
            } else if (message.status === 'error') {
              reject(new Error(message.error));
              isWorkerBusy = false;
            }
          });

          worker.on('error', (error: Error) => {
            reject(error);
            isWorkerBusy = false;
          });

          worker.postMessage(args);
        });
      }
    );

    isHandlerRegistered = true;
  }

  // Добавление обработчиков для управления моделями
  ipcMain.handle(
    'models:check-availability',
    async (): Promise<ModelAvailability> => {
      try {
        return await ModelDownloader.checkAllModelsAvailability();
      } catch (error) {
        throw new Error(`Failed to check models: ${(error as Error).message}`);
      }
    }
  );

  ipcMain.handle(
    'models:download',
    async (_event: any, modelName: string): Promise<ModelOperationResult> => {
      try {
        await ModelDownloader.downloadModel(modelName, (progress: any) => {
          mainWindow?.webContents.send('models:download-progress', progress);
        });
        return { success: true };
      } catch (error) {
        throw new Error(
          `Failed to download model ${modelName}: ${(error as Error).message}`
        );
      }
    }
  );

  ipcMain.handle('models:get-available', (): AvailableModels => {
    try {
      return ModelDownloader.getAvailableModels();
    } catch (error) {
      throw new Error(
        `Failed to get available models: ${(error as Error).message}`
      );
    }
  });

  ipcMain.handle(
    'models:delete',
    async (_event: any, modelName: string): Promise<ModelOperationResult> => {
      try {
        await ModelDownloader.deleteModel(modelName);
        return { success: true };
      } catch (error) {
        throw new Error(
          `Failed to delete model ${modelName}: ${(error as Error).message}`
        );
      }
    }
  );

  // Создание IPC handlers для Ollama API
  setupOllamaIpcHandlers();
}

/**
 * Настраивает IPC обработчики для работы с Ollama API
 * Создает обработчики для генерации, установки, удаления и получения списка моделей
 */
function setupOllamaIpcHandlers(): void {
  if (!ollamaApi) {
    console.error('OllamaApi не инициализирован');
    return;
  }

  /**
   * Обработчик для генерации текста через Ollama
   * Поддерживает streaming ответы и отправляет прогресс в renderer процесс
   */
  ipcMain.handle(
    'ollama:generate',
    async (_event: any, request: OllamaGenerateRequest): Promise<string> => {
      try {
        if (!request.model || !request.prompt) {
          throw new Error('Model and prompt are required');
        }

        let fullResponse = '';

        await ollamaApi!.generate(request, chunk => {
          // Отправляем streaming ответы в renderer процесс
          mainWindow?.webContents.send('ollama:generate-progress', chunk);

          if (chunk.response) {
            fullResponse += chunk.response;
          }
        });

        return fullResponse;
      } catch (error) {
        console.error('Ошибка генерации через Ollama:', error);
        throw new Error(`Generation failed: ${(error as Error).message}`);
      }
    }
  );

  /**
   * Обработчик для установки модели через Ollama
   * Отправляет прогресс установки в renderer процесс
   */
  ipcMain.handle(
    'models:install',
    async (
      _event: any,
      request: OllamaPullRequest
    ): Promise<{ success: boolean }> => {
      try {
        if (!request.name) {
          throw new Error('Model name is required');
        }

        const result = await ollamaApi!.installModel(request, progress => {
          // Отправляем прогресс установки в renderer процесс
          mainWindow?.webContents.send('models:install-progress', progress);
        });

        return { success: result.success };
      } catch (error) {
        console.error('Ошибка установки модели:', error);
        throw new Error(`Installation failed: ${(error as Error).message}`);
      }
    }
  );

  /**
   * Обработчик для удаления модели через Ollama
   */
  ipcMain.handle(
    'models:remove',
    async (
      _event: any,
      request: OllamaDeleteRequest
    ): Promise<{ success: boolean }> => {
      try {
        if (!request.name) {
          throw new Error('Model name is required');
        }

        const result = await ollamaApi!.removeModel(request);
        return { success: result.success };
      } catch (error) {
        console.error('Ошибка удаления модели:', error);
        throw new Error(`Removal failed: ${(error as Error).message}`);
      }
    }
  );

  /**
   * Обработчик для получения списка моделей через Ollama
   */
  ipcMain.handle('models:list', async (): Promise<any> => {
    try {
      const models = await ollamaApi!.listModels();
      return models;
    } catch (error) {
      console.error('Ошибка получения списка моделей:', error);
      throw new Error(`Failed to list models: ${(error as Error).message}`);
    }
  });
}

/**
 * Инициализирует приложение при готовности Electron
 * Запускает Ollama и создает главное окно
 */
app.on('ready', async () => {
  try {
    // Инициализирует Ollama перед созданием окна
    await initializeOllama();

    // Создает главное окно
    createWindow();

    console.log('Приложение успешно инициализировано');
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);

    // Создает окно даже при ошибке Ollama для отображения ошибки
    createWindow();
  }
});

// Выход когда все окна закрыты, кроме macOS. Там обычно
// приложения и их панель меню остаются активными пока пользователь
// явно не выйдет с помощью Cmd + Q
app.on('window-all-closed', async () => {
  if (!isMac) {
    // Останавливает Ollama при закрытии приложения
    try {
      await ollamaManager.stopOllama();
      console.log('Ollama сервер остановлен');
    } catch (error) {
      console.error('Ошибка остановки Ollama:', error);
    }

    app.quit();
  }
});

app.on('activate', () => {
  // На OS X обычно пересоздается окно в приложении когда
  // иконка в dock кликается и нет других открытых окон
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Обработка завершения работы приложения
app.on('before-quit', async () => {
  // Останавливает Ollama при принудительном закрытии
  try {
    await ollamaManager.stopOllama();
    console.log('Ollama сервер остановлен при закрытии приложения');
  } catch (error) {
    console.error('Ошибка остановки Ollama при закрытии:', error);
  }
});

// В этом файле можно включить остальной специфичный для приложения
// код основного процесса. Также можно поместить их в отдельные файлы
// и импортировать сюда
