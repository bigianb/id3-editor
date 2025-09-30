// Sandboxed renderer preload scripts cannot use ESM
const { contextBridge, ipcRenderer } = require('electron/renderer');


contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
});

contextBridge.exposeInMainWorld('game', {
  config: () => ipcRenderer.invoke('game-config')
});

contextBridge.exposeInMainWorld('bsp', {
  load: (name: string) => ipcRenderer.invoke('bsp-load', name)
});

contextBridge.exposeInMainWorld('basefs', {
  exists: (name: string) => ipcRenderer.invoke('file-exists', name),
  load: (name: string) => ipcRenderer.invoke('file-load', name),
  loadShaders: () => ipcRenderer.invoke('shaders-load')
});
