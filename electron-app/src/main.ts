const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');
const ModelDownloader = require('./services/model-downloader');
import type {
  MenuTranslations,
  TransformersArgs,
  WorkerStatus,
  ModelAvailability,
  ModelOperationResult,
  AvailableModels,
} from './types/electron';

if (require('electron-squirrel-startup')) {
  app.quit();
}

const isDev: boolean = process.env['NODE_ENV'] === 'development';
let worker: typeof Worker | null = null;
let mainWindow: typeof BrowserWindow | null = null;
let isHandlerRegistered: boolean = false;
const isMac: boolean = process.platform === 'darwin';
const isWindows: boolean = process.platform === 'win32';

let translations: MenuTranslations = {};

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
    // Для macOS - устанавливаем глобальное меню приложения
    Menu.setApplicationMenu(menu);
  } else {
    // Для Windows и других платформ - устанавливаем меню окна
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
    mainWindow.loadURL('http://localhost:8000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../react/index.html'));
  }

  // Явное удаление обработчиков при закрытии окна
  mainWindow.on('closed', () => {
    ipcMain.removeHandler('transformers:run');
    ipcMain.removeHandler('models:check-availability');
    ipcMain.removeHandler('models:download');
    ipcMain.removeHandler('models:get-available');
    ipcMain.removeHandler('models:delete');
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
}

// Этот метод будет вызван когда Electron завершит
// инициализацию и будет готов создавать браузерные окна.
// Некоторые API могут использоваться только после этого события
app.on('ready', createWindow);

// Выход когда все окна закрыты, кроме macOS. Там обычно
// приложения и их панель меню остаются активными пока пользователь
// явно не выйдет с помощью Cmd + Q
app.on('window-all-closed', () => {
  if (!isMac) {
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

// В этом файле можно включить остальной специфичный для приложения
// код основного процесса. Также можно поместить их в отдельные файлы
// и импортировать сюда
