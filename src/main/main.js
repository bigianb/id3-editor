import { app, BrowserWindow, ipcMain } from 'electron/main';
import path from 'node:path';
//import { fileURLToPath } from 'url';
import BspReader from '../../idlib/BspReader.js';

//const __dirname = path.dirname(fileURLToPath(import.meta.url));
let basePath = path.join(__dirname, '..', '..', 'alice-data');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: { preload: path.join(__dirname, '../preload/preload.mjs'),
      sandbox: false  // Allows hot module reloading
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  //mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
};

app.whenReady().then(() => {
  ipcMain.handle('bsp-load', async (event, bspName) => {
    // Handle the request to load a BSP file
    const bsp = await new BspReader(basePath).load(bspName);
    return bsp;
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
