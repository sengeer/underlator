const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');
const ModelDownloader = require('./services/model-downloader');
import {
  OllamaManager,
  OllamaApi,
  ModelCatalogService,
  SplashManager,
} from './services';
import { IpcHandler } from './presentation/ipc/ipc-handlers';
import {
  createSplashIpcHandler,
  SplashIpcHandler,
} from './presentation/ipc/splash-handlers';
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
  ModelCatalog,
  OllamaModelInfo,
  CatalogFilters,
  SplashMessages,
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
let modelCatalogService: ModelCatalogService | null = null;
let splashManager: SplashManager | null = null;
const isMac: boolean = process.platform === 'darwin';
const isWindows: boolean = process.platform === 'win32';

let translations: MenuTranslations = {};

/**
 * Инициализирует Ollama и создает API клиент
 * Выполняется при старте приложения для подготовки Ollama к работе
 * Обновляет статус splash screen в процессе инициализации
 */
async function initializeOllama(): Promise<void> {
  try {
    console.log('Инициализация Ollama...');

    if (splashManager) {
      await splashManager.updateStatus({
        status: 'checking_ollama',
        message: 'Проверка Ollama...',
        details: 'Проверяем доступность Ollama сервера',
        progress: 10,
      });
    }

    // Инициализирует OllamaManager
    await OllamaManager.initialize();

    if (splashManager) {
      await splashManager.updateStatus({
        status: 'starting_ollama',
        message: 'Запуск Ollama сервера...',
        details: 'Запускаем локальный Ollama сервер',
        progress: 25,
      });
    }

    // Запускает Ollama сервер
    const isStarted = await OllamaManager.startOllama();

    if (isStarted) {
      console.log('Ollama сервер успешно запущен');
    } else {
      console.log('Ollama сервер уже был запущен');
    }

    if (splashManager) {
      await splashManager.updateStatus({
        status: 'waiting_for_server',
        message: 'Ожидание запуска сервера...',
        details: 'Ждем готовности Ollama сервера',
        progress: 40,
      });
    }

    // Создает API клиент для взаимодействия с Ollama
    ollamaApi = new OllamaApi();

    if (splashManager) {
      await splashManager.updateStatus({
        status: 'health_check',
        message: 'Проверка состояния сервера...',
        details: 'Выполняем проверку работоспособности',
        progress: 60,
      });
    }

    // Проверяет доступность сервера
    const isHealthy = await ollamaApi.healthCheck();
    if (isHealthy) {
      console.log('Ollama API доступен');
    } else {
      console.warn('Ollama API недоступен, но сервер запущен');
    }

    if (splashManager) {
      await splashManager.updateStatus({
        status: 'creating_api',
        message: 'Создание API клиента...',
        details: 'Настраиваем подключение к Ollama API',
        progress: 75,
      });
    }

    // Создает сервис каталога моделей
    modelCatalogService = new ModelCatalogService();

    if (splashManager) {
      await splashManager.updateStatus({
        status: 'creating_catalog',
        message: 'Инициализация каталога моделей...',
        details: 'Подготавливаем каталог доступных моделей',
        progress: 90,
      });
    }

    // Регистрирует IPC handlers после создания всех сервисов
    console.log('🔧 Регистрация IPC handlers...');
    setupOllamaIpcHandlers();
    setupCatalogIpcHandlers();
    console.log('✅ IPC handlers зарегистрированы');

    if (splashManager) {
      await splashManager.updateStatus({
        status: 'ready',
        message: 'Готово!',
        details: 'Приложение готово к работе',
        progress: 100,
      });
    }

    console.log('Ollama успешно инициализирован');
  } catch (error) {
    console.error('Ошибка инициализации Ollama:', error);

    // Обновляет статус splash screen с ошибкой
    if (splashManager) {
      await splashManager.handleError(
        `Не удалось инициализировать Ollama: ${(error as Error).message}`
      );
    }

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
 * Настраивает IPC обработчики для splash screen
 * Создает обработчики для управления splash screen
 */
function setupSplashIpcHandlers(): void {
  console.log('🔧 Настройка Splash IPC handlers...');
  if (!splashManager) {
    console.error('❌ SplashManager не инициализирован');
    return;
  }
  console.log('✅ SplashManager доступен, регистрируем handlers...');

  const splashHandler = createSplashIpcHandler(splashManager);

  /**
   * Обработчик для обновления статуса splash screen
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'splash:update-status',
    SplashIpcHandler.createSplashHandlerWrapper(
      async (request: SplashMessages) => {
        return await splashHandler.handleUpdateStatus(request);
      },
      'splash:update-status'
    )
  );

  /**
   * Обработчик для установки прогресса splash screen
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'splash:set-progress',
    SplashIpcHandler.createSplashHandlerWrapper(
      async (request: { progress: number }) => {
        return await splashHandler.handleSetProgress(request);
      },
      'splash:set-progress'
    )
  );

  /**
   * Обработчик для завершения инициализации splash screen
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'splash:complete',
    SplashIpcHandler.createSplashHandlerWrapper(async (_request: unknown) => {
      return await splashHandler.handleComplete(_request);
    }, 'splash:complete')
  );

  /**
   * Обработчик для обработки ошибки splash screen
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'splash:error',
    SplashIpcHandler.createSplashHandlerWrapper(
      async (request: { error: string }) => {
        return await splashHandler.handleError(request);
      },
      'splash:error'
    )
  );

  /**
   * Обработчик для получения текущего статуса splash screen
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'splash:get-status',
    SplashIpcHandler.createSplashHandlerWrapper(async (_request: unknown) => {
      return await splashHandler.handleGetStatus(_request);
    }, 'splash:get-status')
  );

  /**
   * Обработчик для скрытия splash screen
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'splash:hide',
    SplashIpcHandler.createSplashHandlerWrapper(async (_request: unknown) => {
      return await splashHandler.handleHide(_request);
    }, 'splash:hide')
  );

  console.log('IPC обработчики splash screen настроены');
}

/**
 * Создает главное окно приложения
 * Настраивает размеры, иконки и webPreferences
 * Инициализирует splash screen перед загрузкой основного приложения
 */
function createWindow(): void {
  buildMenu();

  /**
   * Определяет путь к preload скрипту
   */
  const preloadPath = path.join(__dirname, 'preload.js');

  // Создание браузерного окна
  mainWindow = new BrowserWindow({
    width: 480,
    height: 350,
    minWidth: 480,
    minHeight: 350,
    icon: path.join(__dirname, '../icons', isWindows ? 'icon.ico' : ''),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Вызывает инициализацию splash screen
  initializeSplashScreen();

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

    // Удаляет обработчики каталога моделей
    ipcMain.removeHandler('catalog:get');
    ipcMain.removeHandler('catalog:search');
    ipcMain.removeHandler('catalog:get-model-info');

    // Удаляет обработчики splash screen
    ipcMain.removeHandler('splash:update-status');
    ipcMain.removeHandler('splash:set-progress');
    ipcMain.removeHandler('splash:complete');
    ipcMain.removeHandler('splash:error');
    ipcMain.removeHandler('splash:get-status');
    ipcMain.removeHandler('splash:hide');

    isHandlerRegistered = false;

    if (worker) {
      worker.terminate();
      worker = null;
    }

    if (splashManager) {
      splashManager.cleanup();
      splashManager = null;
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

  // IPC handlers будут зарегистрированы после инициализации сервисов
  // в функциях initializeOllama() и initializeSplashScreen()
}

/**
 * Инициализирует splash screen
 * Создает SplashManager и настраивает IPC обработчики
 */
async function initializeSplashScreen(): Promise<void> {
  try {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    console.log('Инициализация splash screen...');

    // Создает SplashManager
    splashManager = new SplashManager({
      minDisplayTime: 2000,
      autoHide: true,
      showDetails: true,
    });

    // Инициализирует splash screen
    await splashManager.initialize(mainWindow);

    // Регистрируем IPC handlers для splash screen после создания SplashManager
    setupSplashIpcHandlers();

    console.log('Splash screen инициализирован');
  } catch (error) {
    console.error('Ошибка инициализации splash screen:', error);
  }
}

/**
 * Настраивает IPC обработчики для работы с Ollama API
 * Создает обработчики для генерации, установки, удаления и получения списка моделей
 * Использует централизованные утилиты для валидации, логирования и обработки ошибок
 */
function setupOllamaIpcHandlers(): void {
  console.log('🔧 Настройка Ollama IPC handlers...');
  if (!ollamaApi) {
    console.error('❌ OllamaApi не инициализирован');
    return;
  }
  console.log('✅ OllamaApi доступен, регистрируем handlers...');

  /**
   * Обработчик для генерации текста через Ollama
   * Поддерживает streaming ответы и отправляет прогресс в renderer процесс
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'ollama:generate',
    IpcHandler.createHandlerWrapper(
      async (request: OllamaGenerateRequest): Promise<string> => {
        // Валидация входящего запроса
        const validation = IpcHandler.validateRequest(request, [
          'model',
          'prompt',
        ]);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        let fullResponse = '';

        await ollamaApi!.generate(request, chunk => {
          // Отправка streaming ответов в renderer процесс
          mainWindow?.webContents.send('ollama:generate-progress', chunk);

          if (chunk.response) {
            fullResponse += chunk.response;
          }
        });

        return fullResponse;
      },
      'ollama:generate'
    )
  );

  /**
   * Обработчик для установки модели через Ollama
   * Отправляет прогресс установки в renderer процесс
   * Использует streaming wrapper для обработки прогресса
   */
  ipcMain.handle(
    'models:install',
    IpcHandler.createStreamingHandlerWrapper(
      async (
        request: OllamaPullRequest,
        onProgress: (progress: any) => void
      ): Promise<{ success: boolean }> => {
        // Валидация входящего запроса
        const validation = IpcHandler.validateRequest(request, ['name']);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const result = await ollamaApi!.installModel(request, progress => {
          // Отправляет прогресс установки в renderer процесс
          mainWindow?.webContents.send('models:install-progress', progress);
          // Вызывает callback для логирования прогресса
          onProgress(progress);
        });

        return { success: result.success };
      },
      'models:install'
    )
  );

  /**
   * Обработчик для удаления модели через Ollama
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'models:remove',
    IpcHandler.createHandlerWrapper(
      async (request: OllamaDeleteRequest): Promise<{ success: boolean }> => {
        // Валидация входящего запроса
        const validation = IpcHandler.validateRequest(request, ['name']);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const result = await ollamaApi!.removeModel(request);
        return { success: result.success };
      },
      'models:remove'
    )
  );

  /**
   * Обработчик для получения списка моделей через Ollama
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'models:list',
    IpcHandler.createHandlerWrapper(async (): Promise<any> => {
      const models = await ollamaApi!.listModels();
      return models;
    }, 'models:list')
  );
}

/**
 * Настраивает IPC обработчики для работы с каталогом моделей
 * Создает обработчики для получения каталога, поиска и информации о моделях
 * Использует централизованные утилиты для валидации, логирования и обработки ошибок
 */
function setupCatalogIpcHandlers(): void {
  console.log('🔧 Настройка Catalog IPC handlers...');
  if (!modelCatalogService) {
    console.error('❌ ModelCatalogService не инициализирован');
    return;
  }
  console.log('✅ ModelCatalogService доступен, регистрируем handlers...');

  /**
   * Обработчик для получения полного каталога моделей
   * Поддерживает принудительное обновление кэша
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'catalog:get',
    IpcHandler.createHandlerWrapper(
      async (
        params: { forceRefresh?: boolean } = {}
      ): Promise<ModelCatalog> => {
        const result = await modelCatalogService!.getAvailableModels(
          params.forceRefresh || false
        );

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to get catalog');
        }

        return result.data;
      },
      'catalog:get'
    )
  );

  /**
   * Обработчик для поиска моделей по фильтрам
   * Поддерживает различные параметры фильтрации и поиска
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'catalog:search',
    IpcHandler.createHandlerWrapper(
      async (filters: CatalogFilters): Promise<ModelCatalog> => {
        // Валидация входящих фильтров
        const validation = IpcHandler.validateRequest(filters, []);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const result = await modelCatalogService!.searchModels(filters);

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to search models');
        }

        return result.data;
      },
      'catalog:search'
    )
  );

  /**
   * Обработчик для получения информации о конкретной модели
   * Возвращает детальную информацию о модели из каталога
   * Использует wrapper для автоматического логирования и обработки ошибок
   */
  ipcMain.handle(
    'catalog:get-model-info',
    IpcHandler.createHandlerWrapper(
      async (params: {
        modelName: string;
      }): Promise<OllamaModelInfo | null> => {
        // Валидация входящего запроса
        const validation = IpcHandler.validateRequest(params, ['modelName']);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const result = await modelCatalogService!.getModelInfo(
          params.modelName
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to get model info');
        }

        return result.data || null;
      },
      'catalog:get-model-info'
    )
  );
}

/**
 * Инициализирует приложение при готовности Electron
 * Запускает splash screen, затем Ollama и создает главное окно
 */
app.on('ready', async () => {
  try {
    // Создает главное окно с splash screen
    createWindow();

    // Задержка 1 секунда для инициализации splash screen
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Инициализирует Ollama с обновлением splash screen
    await initializeOllama();

    // Завершает инициализацию и скрывает splash screen
    if (splashManager) {
      await splashManager.complete();
    }

    console.log('Приложение успешно инициализировано');
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);

    // Обрабатывает ошибку в splash screen
    if (splashManager) {
      await splashManager.handleError(
        `Ошибка инициализации: ${(error as Error).message}`
      );
    }

    // Создает окно даже при ошибке для отображения ошибки
    if (!mainWindow) {
      createWindow();
    }
  }
});

// Выход когда все окна закрыты, кроме macOS. Там обычно
// приложения и их панель меню остаются активными пока пользователь
// явно не выйдет с помощью Cmd + Q
app.on('window-all-closed', async () => {
  if (!isMac) {
    // Останавливает Ollama при закрытии приложения
    try {
      await OllamaManager.stopOllama();
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
    await OllamaManager.stopOllama();
    console.log('Ollama сервер остановлен при закрытии приложения');
  } catch (error) {
    console.error('Ошибка остановки Ollama при закрытии:', error);
  }
});

// В этом файле можно включить остальной специфичный для приложения
// код основного процесса. Также можно поместить их в отдельные файлы
// и импортировать сюда
