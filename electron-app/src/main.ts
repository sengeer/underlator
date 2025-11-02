/**
 * @module MainProcess
 * В этом главном модуле можно включить остальной специфичный
 * для приложения код основного процесса.
 * Также можно поместить их в отдельные файлы и импортировать сюда.
 */

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
import { OllamaApi } from './services/ollama-api';
import { ollamaManager } from './services/ollama-manager';
import { ModelCatalogService } from './services/model-catalog';
import { ChatFileSystemService } from './services/filesystem-chat';
import { VectorStoreService } from './services/vector-store';
import { EmbeddingService } from './services/embedding';
import { SplashHandlers } from './presentation/ipc/splash-handlers';
import { ChatHandlers } from './presentation/ipc/chat-handlers';
import { ModelHandlers } from './presentation/ipc/model-handlers';
import { CatalogHandlers } from './presentation/ipc/catalog-handlers';
import type { MenuTranslations } from './types/electron';
import type { SplashMessages } from './types/splash';
import { RagHandlers } from './presentation/ipc/rag-handlers';

if (require('electron-squirrel-startup')) {
  app.quit();
}

/**
 * Определяет development режим.
 * В Electron Forge с webpack NODE_ENV корректно передается через cross-env.
 */
export const isDev: boolean = process.env['NODE_ENV'] === 'development';
console.log('🔧 NODE_ENV:', process.env['NODE_ENV']);

export let mainWindow: typeof BrowserWindow | null = null;
export let ollamaApi: OllamaApi | null = null;
export let modelCatalogService: ModelCatalogService | null = null;
let chatFileSystemService: ChatFileSystemService | null = null;
let vectorStoreService: VectorStoreService | null = null;
let embeddingService: EmbeddingService | null = null;
let splashHandlers: SplashHandlers | null = null;
let chatHandlers: ChatHandlers | null = null;
let modelHandlers: ModelHandlers | null = null;
let catalogHandlers: CatalogHandlers | null = null;
let ragHandlers: RagHandlers | null = null;
export let currentAbortController: AbortController | null = null;
const isMac: boolean = process.platform === 'darwin';
const isWindows: boolean = process.platform === 'win32';

export let translations: MenuTranslations = {};
let isQuitting: boolean = false; // Флаг для отслеживания намерения завершить приложение

/**
 * Очищает ресурсы при закрытии приложения.
 * Удаляет все IPC обработчики и ресурсы.
 */
async function cleanupResources(): Promise<void> {
  console.log('🧹 Cleaning up application resources...');

  // Останавливает Ollama
  await ollamaManager.stopOllama();

  // Удаляет обработчики управления моделями
  modelHandlers?.removeHandlers();

  // Удаляет обработчики каталога моделей
  catalogHandlers?.removeHandlers();

  // Удаляет обработчики splash screen
  splashHandlers?.removeHandlers();

  // Удаляет обработчики чатов
  chatHandlers?.removeHandlers();

  // Удаляет обработчики RAG системы
  ragHandlers?.removeHandlers();

  // Очищает ресурсы векторного хранилища
  if (vectorStoreService) {
    await vectorStoreService.cleanup();
    vectorStoreService = null;
  }

  mainWindow = null;
  console.log('✅ Resources have been cleared');
}

/**
 * Отправляет статус splash screen в React приложение.
 * Используется для передачи обновлений статуса инициализации.
 *
 * @param status - Статус для отправки в React splash screen.
 */
function sendSplashStatus(status: SplashMessages): void {
  console.log('📤 Sending the splash screen status:', status);
  if (mainWindow) {
    mainWindow.webContents.send('splash:status-update', status);
    console.log('✅ The status has been sent to the React app');
  } else {
    console.error('❌ The main window is not available for sending the status');
  }
}

/**
 * Отправляет сигнал завершения инициализации в React приложение.
 * Используется для уведомления о готовности приложения.
 */
function sendSplashComplete(): void {
  if (mainWindow) {
    mainWindow.webContents.send('splash:complete');
  }
}

/**
 * Отправляет ошибку инициализации в React приложение.
 * Используется для отображения ошибок в splash screen.
 *
 * @param error - Текст ошибки.
 */
function sendSplashError(error: string): void {
  if (mainWindow) {
    mainWindow.webContents.send('splash:error', error);
  }
}

/**
 * Преобразование ошибки в строку.
 * Используется для преобразования ошибки в строку.
 */
function convertErrorToString(error: Error) {
  let errorMessage = 'Critical error in main process';
  if (error instanceof Error) {
    // Если это объект Error,
    // используется его stack или хотя бы message
    errorMessage = error.stack || error.message || String(error);
  } else {
    // Если это не Error,
    // преобразуется в строку
    errorMessage = String(error);
  }

  return errorMessage;
}

/**
 * Обработчик неперехваченных ошибок в главном процессе.
 * Используется для отправки ошибок в splash screen.
 */
process.on('uncaughtException', error => {
  console.error('❌ Unhandled exception in main process:', error);
  sendSplashError(convertErrorToString(error));
});

/**
 * По очереди инициализирует различные модули Electron приложения.
 * Выполняется при старте.
 * Отправляет статус инициализации в React splash screen через IPC.
 */
async function loadPipeline(): Promise<void> {
  try {
    console.log('🚀 Starting initialization of app...');

    // Отправляет статус проверки Ollama в React splash screen
    sendSplashStatus({
      status: 'checking-ollama',
      message: translations.LOADING_APP || '',
    });

    // Инициализирует OllamaManager
    await ollamaManager.initialize();

    // Отправляет статус запуска Ollama в React splash screen
    sendSplashStatus({
      status: 'starting-ollama',
      message: translations.LOADING_APP || '',
    });

    // Запускает Ollama сервер
    const isStarted = await ollamaManager.startOllama();

    if (isStarted) {
      console.log('✅ Ollama server is running successfully');
    } else {
      console.log('🔄 The Ollama server has already been started');
    }

    // Отправляет статус ожидания сервера в React splash screen
    sendSplashStatus({
      status: 'waiting-for-server',
      message: translations.LOADING_APP || '',
      progress: 36,
    });

    // Создает API клиент для взаимодействия с Ollama
    ollamaApi = new OllamaApi();

    // Отправляет статус создания сервиса эмбеддингов в React splash screen
    sendSplashStatus({
      status: 'creating-api',
      message: 'Initializing embedding service...',
      progress: 52,
    });

    // Создает сервис эмбеддингов
    embeddingService = new EmbeddingService(ollamaApi);
    const embeddingInitResult = await embeddingService.initialize();

    if (embeddingInitResult.success) {
      console.log('✅ Embedding service successfully initialized');
    } else {
      console.warn(
        `❌ Error initializing embedding service: ${embeddingInitResult.error}`
      );
    }

    // Отправляет статус проверки здоровья в React splash screen
    sendSplashStatus({
      status: 'health-check',
      message: translations.LOADING_APP || '',
      progress: 60,
    });

    // Проверяет доступность сервера
    const isHealthy = await ollamaApi.healthCheck();
    if (isHealthy) {
      console.log('✅ The Ollama API is available');
    } else {
      console.warn(
        '⚠️ The Ollama API is unavailable, but the server is running'
      );
    }

    // Создаёт экземпляр IPC обработчиков для управления моделями
    modelHandlers = new ModelHandlers();

    // Создает экземпляр IPC обработчиков для каталога моделей
    catalogHandlers = new CatalogHandlers();

    // Отправляет статус создания API в React splash screen
    sendSplashStatus({
      status: 'creating-api',
      message: translations.LOADING_APP || '',
      progress: 60,
    });

    // Создает сервис каталога моделей с использованием существующего OllamaApi
    modelCatalogService = new ModelCatalogService(undefined, ollamaApi);

    // Отправляет статус создания каталога в React splash screen
    sendSplashStatus({
      status: 'creating-catalog',
      message: translations.LOADING_APP || '',
      progress: 72,
    });

    // Создает сервис файловой системы для чатов
    chatFileSystemService = new ChatFileSystemService();
    await chatFileSystemService.initialize();

    // Создает сервис векторного хранилища (полностью локальное SQLite решение)
    vectorStoreService = new VectorStoreService();
    const vectorStoreInitResult = await vectorStoreService.initialize();

    if (vectorStoreInitResult.success) {
      console.log('✅ VectorStoreService initialized successfully');
    } else {
      console.error(
        '❌ Failed to initialize VectorStoreService:',
        vectorStoreInitResult.error
      );
      console.log(
        '⚠️ RAG functionality will be limited until Qdrant is started'
      );
    }

    // Создает обработчики чатов
    chatHandlers = new ChatHandlers(chatFileSystemService);

    // Отправляет статус создания файловой системы в React splash screen
    sendSplashStatus({
      status: 'creating-filesystem',
      message: translations.LOADING_APP || '',
      progress: 78,
    });

    // Регистрирует IPC handlers после создания всех сервисов
    console.log('🔧 IPC handlers registration...');
    setupOllamaIpcHandlers();
    setupCatalogIpcHandlers();
    setupChatIpcHandlers();

    // RAG handlers регистрируются только после инициализации всех зависимостей
    // Важно: setupRAGIpcHandlers будет вызван позже, когда все сервисы готовы
    console.log('✅ IPC handlers registration started');

    // Инициализирует RAG handlers после завершения загрузки каталога
    // NOTE: было обёрнуто в setTimeout(async () => { }, 2000); для задержки инициализации
    try {
      // Проверяет, что все сервисы инициализированы
      if (!vectorStoreService || !embeddingService) {
        console.warn('⚠️ VectorStoreService or EmbeddingService not ready');
        console.log('⚠️ RAG functionality will be limited');
        return;
      }

      await setupRAGIpcHandlers();
      console.log('✅ RAG IPC handlers registered successfully');
    } catch (error) {
      console.error('❌ Failed to setup RAG handlers:', error);
      console.log('⚠️ RAG functionality may not be fully available');
    }

    sendSplashStatus({
      status: 'getting-catalog',
      message: translations.GETTING_CATALOG || '',
      progress: 84,
    });

    await modelCatalogService.getAvailableModels(true);

    // Отправляет статус готовности в React splash screen
    sendSplashStatus({
      status: 'ready',
      message: translations.LOADING_APP || '',
      progress: 100,
    });

    console.log('✅ Ollama initialized successfully');

    // Отправляет сигнал завершения инициализации в React splash screen
    sendSplashComplete();
  } catch (error) {
    console.error('❌ App initialization error:', error);

    // Отправляет ошибку в React splash screen
    sendSplashError('❌ Failed to initialize app');

    throw new Error(`❌ Failed to initialize app: ${(error as Error).message}`);
  }
}

/**
 * Обработчик обновления переводов меню.
 * Получает новые переводы от renderer процесса и перестраивает меню.
 */
ipcMain.on(
  'update-translations',
  (_event: Electron.IpcMainEvent, newTranslations: MenuTranslations) => {
    translations = newTranslations;
    buildMenu();
  }
);

/**
 * Строит кросс-платформенное меню приложения.
 * Учитывает особенности macOS и Windows для корректного отображения.
 */
function buildMenu(): void {
  // Шаблон кросс-платформенного меню
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: translations.MENU || 'Menu',
      submenu: [
        {
          role: 'about',
          label: translations.ABOUT || 'About',
        },
        { role: 'undo', label: translations.UNDO || 'Undo' },
        { role: 'redo', label: translations.REDO || 'Redo' },
        { role: 'cut', label: translations.CUT || 'Cut' },
        { role: 'copy', label: translations.COPY || 'Copy' },
        { role: 'paste', label: translations.PASTE || 'Paste' },
        { role: 'selectAll', label: translations.SELECT_ALL || 'Select All' },
        {
          role: 'quit',
          label: translations.QUIT || 'Quit',
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
 * Создает главное окно приложения.
 * Настраивает размеры, иконки и webPreferences.
 * Загружает React приложение сразу после создания окна.
 */
function createWindow(): void {
  console.log('🏗️ Creating the main window...');
  buildMenu();

  /**
   * Определяет путь к preload скрипту.
   */
  const preloadPath = path.join(__dirname, 'preload.js');

  // Создание браузерного окна
  mainWindow = new BrowserWindow({
    width: 480,
    height: 350,
    minWidth: 480,
    minHeight: 350,
    icon: isWindows && path.join(__dirname, '../../icons/icon.ico'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Создаёт экземпляр SplashHandlers
  splashHandlers = new SplashHandlers();

  // Регистрирует splash screen handlers
  setupSplashIpcHandlers();

  // Загружает React и Electron приложение
  loadApp();

  /**
   * Обработчик закрытия окна.
   * На macOS скрывает окно только при сворачивании, но позволяет завершение при намеренном выходе.
   * На других платформах закрывает окно полностью.
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
      app.quit();
    }
  });

  /**
   * Обработчик полного закрытия окна.
   * Вызывается только когда окно действительно закрывается.
   */
  mainWindow.on('closed', () => {
    cleanupResources();
  });

  // IPC handlers будут зарегистрированы после инициализации сервисов
  // в функции initializeOllama()
}

/**
 * Загружает React и модули Electron приложения.
 * Используется для загрузки приложения после создания окна.
 */
async function loadApp(): Promise<void> {
  if (!mainWindow) {
    console.error('❌ Main window not available');
    return;
  }

  if (isDev) {
    console.log('🔧 Uploading the URL in dev mode: http://localhost:8000');
    await mainWindow.loadURL('http://localhost:8000');
  } else {
    console.log(
      '🔧 Uploading the file in production mode:',
      path.join(__dirname, '../react/index.html')
    );
    await mainWindow.loadFile(path.join(__dirname, '../react/index.html'));
  }

  loadPipeline().catch(error => {
    console.error('❌ App initialization error:', error);
    sendSplashError('❌ App initialization error');
  });
}

/**
 * Настраивает IPC обработчики для работы с Ollama API.
 * Создает обработчики для генерации, установки, удаления и получения списка моделей.
 * Использует централизованные утилиты для валидации, логирования и обработки ошибок.
 */
function setupOllamaIpcHandlers(): void {
  console.log('🔧 Setting up Ollama IPC handlers...');
  if (!ollamaApi || !modelHandlers) {
    console.error('❌ OllamaApi is not initialized');
    return;
  }
  console.log('✅ OllamaApi is available, register handlers...');
  modelHandlers.registerHandlers();
}

/**
 * Настраивает IPC обработчики для работы с каталогом моделей.
 * Создает обработчики для получения каталога, поиска и информации о моделях.
 * Использует централизованные утилиты для валидации, логирования и обработки ошибок.
 */
function setupCatalogIpcHandlers(): void {
  console.log('🔧 Setting up Catalog IPC handlers...');
  if (!modelCatalogService || !catalogHandlers) {
    console.error('❌ ModelCatalogService is not initialized');
    return;
  }
  console.log('✅ ModelCatalogService is available, register handlers...');
  catalogHandlers.registerHandlers();
}

/**
 * Настраивает простой IPC обработчик для splash screen.
 * Предоставляет React приложению возможность получить текущий статус.
 */
function setupSplashIpcHandlers(): void {
  console.log('🔧 Configuring Splash IPC handlers...');

  if (!splashHandlers) {
    console.error('❌ SplashScreen is not initialized');
    return;
  }

  splashHandlers.registerHandlers();
  console.log('✅ Splash IPC handlers are configured');
}

/**
 * Настраивает IPC обработчики для работы с чатами.
 * Создает обработчики для всех операций CRUD с чатами.
 * Использует централизованные утилиты для валидации, логирования и обработки ошибок.
 */
function setupChatIpcHandlers(): void {
  console.log('🔧 Setting up Chat IPC handlers...');
  if (!chatHandlers) {
    console.error('❌ ChatHandlers is not initialized');
    return;
  }
  console.log('✅ ChatHandlers is available, register handlers...');

  // Регистрирует обработчики чатов
  chatHandlers.registerHandlers();

  console.log('✅ Chat IPC handlers are registered');
}

/**
 * Настраивает IPC обработчики для работы с RAG системой.
 * Создает обработчики для всех операций с документами и векторным хранилищем.
 * Использует централизованные утилиты для валидации, логирования и обработки ошибок.
 */
async function setupRAGIpcHandlers(): Promise<void> {
  console.log('🔧 Setting up RAG IPC handlers...');

  try {
    // Динамический импорт для избежания загрузки pdf-parse при старте
    const { RagHandlers } = await import('./presentation/ipc/rag-handlers');

    // Ленивая инициализация DocumentProcessorService будет происходить при первом использовании
    // Для создания RAGHandlers передается null
    if (!ragHandlers) {
      console.log('🔧 Creating RagHandlers...');
      if (!vectorStoreService || !embeddingService) {
        console.error(
          '❌ VectorStoreService or EmbeddingService is not initialized'
        );
        return;
      }

      // DocumentProcessorService будет инициализирован при первом вызове
      ragHandlers = new RagHandlers(
        vectorStoreService,
        null as any, // Будет инициализирован при первом использовании
        embeddingService
      );
      console.log('✅ RagHandlers created');
    }

    console.log('✅ RagHandlers is available, register handlers...');

    // Регистрирует обработчики RAG
    ragHandlers.registerHandlers();

    console.log('✅ RAG IPC handlers are registered');
  } catch (error) {
    console.error('❌ Failed to setup RAG handlers:', error);
    // Ошибка не пробрасывается, чтобы приложение запускалось в любых случаях
  }
}

/**
 * Инициализирует приложение при готовности Electron.
 * Сначала создает окно и загружает React приложение, затем инициализирует Ollama.
 */
app.on('ready', async () => {
  try {
    console.log('🚀 Electron app ready - starting initialization');

    // Создает главное окно с React приложением и инициализирует Ollama
    console.log('📱 Creating the main window...');
    createWindow();

    console.log('✅ The application has been successfully initialized');
  } catch (error) {
    console.error('❌ Application initialization error:', error);

    // Создает окно даже при ошибке для отображения ошибки
    createWindow();
  }
});

/**
 * Выход когда все окна закрыты, кроме macOS. Там обычно
 * приложения и их панель меню остаются активными пока пользователь
 * явно не выйдет с помощью Cmd + Q.
 */
app.on('window-all-closed', async () => {
  if (!isMac) {
    await cleanupResources();
  }
  // На macOS не выходим из приложения, даже если все окна закрыты
  // Пользователь должен явно выйти через Cmd + Q или меню
});

/**
 * Возобновление приложения.
 */
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

/**
 * Обработка завершения работы приложения.
 */
app.on('before-quit', async () => {
  console.log('🚪 The application is shutting down...');

  // Устанавливает флаг завершения для корректной обработки закрытия окна
  isQuitting = true;

  // Останавливает Ollama при принудительном закрытии
  try {
    await ollamaManager.stopOllama();
    console.log('✅️ Ollama server is stopped when the application is closed');
  } catch (error) {
    console.error('❌ Error stopping Ollama when closing:', error);
  }

  // Очищает все ресурсы приложения
  cleanupResources();
});

/**
 * Обработка системных команд завершения (например, через ПКМ на иконке в dock).
 */
app.on('will-quit', () => {
  console.log('🚪 The system command to terminate the application...');

  // Устанавливает флаг завершения для корректной обработки закрытия окна
  isQuitting = true;
});
