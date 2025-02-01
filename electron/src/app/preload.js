// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Here, we use the `contextBridge` API to expose a custom API to the renderer process.
// This API allows the renderer process to invoke the `transformers:run` event in the main process.
// And also send the `transformers:status` status back to the react-app.
contextBridge.exposeInMainWorld('electron', {
  run: (text) => ipcRenderer.invoke('transformers:run', text),
  onStatus: (callback) =>
    ipcRenderer.on('transformers:status', (event, message) =>
      callback(message)
    ),
});
