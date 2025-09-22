const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
import { OllamaManager, OllamaApi, ModelCatalogService } from './services';
import { IpcHandler } from './presentation/ipc/ipc-handlers';
import type {
  MenuTranslations,
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

export let mainWindow: typeof BrowserWindow | null = null;
let ollamaApi: OllamaApi | null = null;
let modelCatalogService: ModelCatalogService | null = null;
let currentAbortController: AbortController | null = null;
const isMac: boolean = process.platform === 'darwin';
const isWindows: boolean = process.platform === 'win32';

let translations: MenuTranslations = {};
let isQuitting: boolean = false; // Флаг для отслеживания намерения завершить приложение

/**
 * Очищает ресурсы при закрытии приложения
 * Удаляет все IPC обработчики и завершает worker процессы
 */
function cleanupResources(): void {
  console.log('🧹 Очистка ресурсов приложения...');

  // Удаляет Ollama обработчики
  ipcMain.removeHandler('ollama:generate');
  ipcMain.removeHandler('models:install');
  ipcMain.removeHandler('models:remove');
  ipcMain.removeHandler('models:list');

  // Удаляет обработчики каталога моделей
  ipcMain.removeHandler('catalog:get');
  ipcMain.removeHandler('catalog:search');
  ipcMain.removeHandler('catalog:get-model-info');

  // Удаляет обработчики splash screen
  ipcMain.removeHandler('splash:get-status');

  mainWindow = null;
  console.log('✅ Ресурсы очищены');
}

/**
 * Отправляет статус splash screen в React приложение
 * Используется для передачи обновлений статуса инициализации
 * @param status - Статус для отправки в React splash screen
 */
function sendSplashStatus(status: SplashMessages): void {
  console.log('📤 Отправка статуса splash screen:', status);
  if (mainWindow) {
    mainWindow.webContents.send('splash:status-update', status);
    console.log('✅ Статус отправлен в React приложение');
  } else {
    console.error('❌ Main window не доступен для отправки статуса');
  }
}

/**
 * Отправляет сигнал завершения инициализации в React приложение
 * Используется для уведомления о готовности приложения
 */
function sendSplashComplete(): void {
  if (mainWindow) {
    mainWindow.webContents.send('splash:complete');
  }
}

/**
 * Отправляет ошибку инициализации в React приложение
 * Используется для отображения ошибок в splash screen
 * @param error - Текст ошибки
 */
function sendSplashError(error: string): void {
  if (mainWindow) {
    mainWindow.webContents.send('splash:error', error);
  }
}

/**
 * Инициализирует Ollama и создает API клиент
 * Выполняется при старте приложения для подготовки Ollama к работе
 * Отправляет статус инициализации в React splash screen через IPC события
 */
async function initializeOllama(): Promise<void> {
  try {
    console.log('🚀 Начинаем инициализацию Ollama...');

    // Отправляет статус проверки Ollama в React splash screen
    sendSplashStatus({
      status: 'checking-ollama',
      progress: 10,
    });

    // Инициализирует OllamaManager
    await OllamaManager.initialize();

    // Отправляет статус запуска Ollama в React splash screen
    sendSplashStatus({
      status: 'starting-ollama',
      progress: 25,
    });

    // Запускает Ollama сервер
    const isStarted = await OllamaManager.startOllama();

    if (isStarted) {
      console.log('Ollama сервер успешно запущен');
    } else {
      console.log('Ollama сервер уже был запущен');
    }

    // Отправляет статус ожидания сервера в React splash screen
    sendSplashStatus({
      status: 'waiting-for-server',
      progress: 40,
    });

    // Создает API клиент для взаимодействия с Ollama
    ollamaApi = new OllamaApi();

    // Отправляет статус проверки здоровья в React splash screen
    sendSplashStatus({
      status: 'health-check',
      progress: 60,
    });

    // Проверяет доступность сервера
    const isHealthy = await ollamaApi.healthCheck();
    if (isHealthy) {
      console.log('Ollama API доступен');
    } else {
      console.warn('Ollama API недоступен, но сервер запущен');
    }

    // Отправляет статус создания API в React splash screen
    sendSplashStatus({
      status: 'creating-api',
      progress: 75,
    });

    // Создает сервис каталога моделей
    modelCatalogService = new ModelCatalogService();

    // Отправляет статус создания каталога в React splash screen
    sendSplashStatus({
      status: 'creating-catalog',
      progress: 90,
    });

    // Регистрирует IPC handlers после создания всех сервисов
    console.log('🔧 Регистрация IPC handlers...');
    setupOllamaIpcHandlers();
    setupCatalogIpcHandlers();
    console.log('✅ IPC handlers зарегистрированы');

    // Отправляет статус готовности в React splash screen
    sendSplashStatus({
      status: 'ready',
      progress: 100,
    });

    console.log('Ollama успешно инициализирован');

    // Отправляет сигнал завершения инициализации в React splash screen
    sendSplashComplete();
  } catch (error) {
    console.error('Ошибка инициализации Ollama:', error);

    // Отправляет ошибку в React splash screen
    sendSplashError(
      `Не удалось инициализировать Ollama: ${(error as Error).message}`
    );

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
        {
          role: 'quit',
          label: translations.quit || 'Quit',
          click: () => {
            // Устанавливает флаг завершения и корректно выходит из приложения
            isQuitting = true;
            cleanupResources();
            app.quit();
          },
        },
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
 * Загружает React приложение сразу после создания окна
 */
function createWindow(): void {
  console.log('🏗️ Создание главного окна...');
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

  // Загружает React приложение сразу после создания окна
  console.log('🌐 Загружаем React приложение...');
  loadReactApp();

  /**
   * Обработчик закрытия окна
   * На macOS скрывает окно только при сворачивании, но позволяет завершение при намеренном выходе
   * На других платформах закрывает окно полностью
   */
  mainWindow.on('close', (event: Electron.Event) => {
    if (isMac && !isQuitting) {
      // На macOS предотвращает закрытие только если пользователь не намеревается завершить приложение
      // Это позволяет корректно сворачивать в dock, но завершать при явном выходе
      event.preventDefault();
      mainWindow?.hide();
    } else {
      // На других платформах или при намеренном завершении закрывает окно полностью
      cleanupResources();
    }
  });

  /**
   * Обработчик полного закрытия окна
   * Вызывается только когда окно действительно закрывается
   */
  mainWindow.on('closed', () => {
    cleanupResources();
  });

  // Регистрирует splash screen handlers
  setupSplashIpcHandlers();

  // IPC handlers будут зарегистрированы после инициализации сервисов
  // в функции initializeOllama()
}

/**
 * Загружает React приложение в главное окно
 * Используется для загрузки основного приложения после создания окна
 */
function loadReactApp(): void {
  if (!mainWindow) {
    console.error('Main window not available');
    return;
  }

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
        // Создает новый AbortController для этой операции
        currentAbortController = new AbortController();

        // Валидация входящего запроса
        const validation = IpcHandler.validateRequest(request, [
          'model',
          'prompt',
        ]);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        let fullResponse = '';

        try {
          await ollamaApi!.generate(
            request,
            chunk => {
              // Отправка streaming ответов в renderer процесс
              mainWindow?.webContents.send('ollama:generate-progress', chunk);

              if (chunk.response) {
                fullResponse += chunk.response;
              }
            },
            currentAbortController.signal
          );

          return fullResponse;
        } finally {
          // Очищает AbortController после завершения
          currentAbortController = null;
        }
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

  /**
   * Обработчик для остановки генерации через Ollama
   * Прерывает текущую операцию генерации
   */
  ipcMain.handle(
    'ollama:stop',
    IpcHandler.createHandlerWrapper(async (): Promise<void> => {
      if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        console.log('✅ Генерация остановлена');
      } else {
        console.log('⚠️ Нет активной генерации для остановки');
      }
    }, 'ollama:stop')
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
 * Настраивает простой IPC обработчик для splash screen
 * Предоставляет React приложению возможность получить текущий статус
 */
function setupSplashIpcHandlers(): void {
  console.log('🔧 Настройка Splash IPC handlers...');

  /**
   * Обработчик для получения текущего статуса splash screen
   * React приложение использует это для получения актуального состояния
   */
  ipcMain.handle('splash:get-status', async () => {
    // Возвращает базовый статус инициализации
    return {
      status: 'initializing',
      progress: 0,
    };
  });

  console.log('✅ Splash IPC handlers настроены');
}

/**
 * Инициализирует приложение при готовности Electron
 * Сначала создает окно и загружает React приложение, затем инициализирует Ollama
 */
app.on('ready', async () => {
  try {
    console.log('🚀 Electron app ready - начинаем инициализацию');

    // Создает главное окно с React приложением
    console.log('📱 Создаем главное окно...');
    createWindow();

    console.log('⏳ Запускаем асинхронную инициализацию Ollama...');
    // Инициализирует Ollama асинхронно после создания окна
    // Это не блокирует загрузку React приложения
    // Добавляем небольшую задержку, чтобы React приложение успело загрузиться
    setTimeout(() => {
      initializeOllama().catch(error => {
        console.error('Ошибка инициализации Ollama:', error);
        sendSplashError(`Ошибка инициализации Ollama: ${error.message}`);
      });
    }, 2000); // 2 секунды задержки

    console.log('✅ Приложение успешно инициализировано');
  } catch (error) {
    console.error('Ошибка инициализации приложения:', error);

    // Создает окно даже при ошибке для отображения ошибки
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
      await OllamaManager.stopOllama();
      console.log('Ollama сервер остановлен');
    } catch (error) {
      console.error('Ошибка остановки Ollama:', error);
    }

    app.quit();
  }
  // На macOS не выходим из приложения, даже если все окна закрыты
  // Пользователь должен явно выйти через Cmd + Q или меню
});

app.on('activate', () => {
  // На macOS восстанавливает окно при клике на иконку в dock
  if (isMac) {
    if (mainWindow) {
      // Если окно существует, но скрыто - показываем его
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    } else {
      // Если окно не существует - создаем новое
      createWindow();
    }
  } else {
    // На других платформах пересоздаем окно если его нет
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  }
});

// Обработка завершения работы приложения
app.on('before-quit', async () => {
  console.log('🚪 Приложение завершает работу...');

  // Устанавливает флаг завершения для корректной обработки закрытия окна
  isQuitting = true;

  // Останавливает Ollama при принудительном закрытии
  try {
    await OllamaManager.stopOllama();
    console.log('Ollama сервер остановлен при закрытии приложения');
  } catch (error) {
    console.error('Ошибка остановки Ollama при закрытии:', error);
  }

  // Очищает все ресурсы приложения
  cleanupResources();
});

// Обработка системных команд завершения (например, через ПКМ на иконке в dock)
app.on('will-quit', () => {
  console.log('🚪 Системная команда завершения приложения...');

  // Устанавливает флаг завершения для корректной обработки закрытия окна
  isQuitting = true;
});

// В этом файле можно включить остальной специфичный для приложения
// код основного процесса. Также можно поместить их в отдельные файлы
// и импортировать сюда
