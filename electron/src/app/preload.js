// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Here, we use the `contextBridge` API to expose a custom API to the renderer process.
// This API allows the renderer process to invoke the `transformers:run` event in the main process.
// And also send the `transformers:status` status back to the react-app.
contextBridge.exposeInMainWorld('electron', {
  run: (text) => ipcRenderer.invoke('transformers:run', text),
  onStatus: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('transformers:status', subscription);

    return () => {
      ipcRenderer.removeListener('transformers:status', subscription);
    };
  },
  updateTranslations: (translations) => {
    ipcRenderer.send('update-translations', translations);
  },
  // Model management API
  models: {
    checkAvailability: () => ipcRenderer.invoke('models:check-availability'),
    download: (modelName) => ipcRenderer.invoke('models:download', modelName),
    getAvailable: () => ipcRenderer.invoke('models:get-available'),
    delete: (modelName) => ipcRenderer.invoke('models:delete', modelName),
    onDownloadProgress: (callback) => {
      const subscription = (event, progress) => callback(progress);
      ipcRenderer.on('models:download-progress', subscription);

      return () => {
        ipcRenderer.removeListener('models:download-progress', subscription);
      };
    },
  },
});
