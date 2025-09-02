import { app, BrowserWindow, ipcMain } from 'electron/main';
import path from 'node:path';
import fs from 'fs';
import BspReader from '../../idlib/BspReader.js';

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

    // Useful for development
    fs.writeFileSync(bspName + '.json', JSON.stringify(bsp, undefined, 2));
    return {basePath, ...bsp};
  });

  ipcMain.handle('file-load', async (event, fileName) => {
    // Handle the request to load a file from the game fs

    const fileContents = await fs.promises.readFile(path.join(basePath, fileName));
    return fileContents;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // For development, ignore the mac behavior
  //if (process.platform !== 'darwin') {
    app.quit();
  //}
});
