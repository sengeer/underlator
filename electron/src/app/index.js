const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');

const isDev = process.env.NODE_ENV === 'development';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let worker = null;
let mainWindow = null;
let isHandlerRegistered = false;

let translations = {};

ipcMain.on('update-translations', (_, newTranslations) => {
  translations = newTranslations;
  buildMenu();
});

function buildMenu() {
  const template = [
    {
      label: '',
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
  Menu.setApplicationMenu(menu);
}

const createWindow = () => {
  buildMenu();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 480,
    height: 350,
    minWidth: 480,
    minHeight: 350,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: true,
    },
  });

  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:8000');
  } else {
    mainWindow.loadFile(path.join('src', 'index.html'));
  }

  // Explicitly remove the handler on the closed event.
  mainWindow.on('closed', () => {
    ipcMain.removeHandler('transformers:run');
    isHandlerRegistered = false;

    if (worker) {
      worker.terminate();
      worker = null;
    }

    mainWindow = null;
  });

  // Checking for a repeated call of a worker.
  let isWorkerBusy = false;

  // Add a handler for the `transformers:run` event.
  if (!isHandlerRegistered) {
    ipcMain.handle('transformers:run', (event, args) => {
      return new Promise((resolve, reject) => {
        if (isWorkerBusy) {
          reject(new Error('Worker is busy'));
          return;
        }

        if (!worker) {
          worker = new Worker(path.join(__dirname, 'worker.js'));
        }

        isWorkerBusy = true;

        worker.on('message', (message) => {
          mainWindow.webContents.send('transformers:status', message);
          if (message.status === 'complete') {
            resolve(message.output);
            isWorkerBusy = false;
          } else if (message.status === 'error') {
            reject(new Error(message.error));
            isWorkerBusy = false;
          }
        });

        worker.on('error', (error) => {
          reject(error);
          isWorkerBusy = false;
        });

        worker.postMessage(args);
      });
    });

    isHandlerRegistered = true;
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
