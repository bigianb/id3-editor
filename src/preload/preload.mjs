// Sandboxed renderer preload scripts cannot use ESM
const { contextBridge, ipcRenderer } = require('electron/renderer');


contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
});

contextBridge.exposeInMainWorld('bsp', {
  load: (name) => ipcRenderer.invoke('bsp-load', name)
});

contextBridge.exposeInMainWorld('basefs', {
  load: (name) => ipcRenderer.invoke('file-load', name)
});
