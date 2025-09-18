import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { app, BrowserWindow, ipcMain } from 'electron/main';
import path from 'node:path';
import fs from 'fs';
import BspReader from '../../idlib/BspReader.js';
import FileSystem from '../../idlib/FileSystem.js';

const argv = yargs(hideBin(process.argv)).parse()

let basePath = path.join(__dirname, '..', '..', 'alice-data');

console.log('argv', argv);
if (argv['fs_game']) {
  basePath = argv['fs_game'];
}

app.commandLine.appendSwitch('disable-frame-rate-limit');

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

const fileSystem = new FileSystem(basePath);

app.whenReady().then(async() => {
  await fileSystem.register(['pak0.pk3', 'pak1.pk3', 'pak1_large.pk3', 'pak2.pk3', 'pak3.pk3', 'pak4_english.pk3', 'pak5_mod.pk3']);
  ipcMain.handle('bsp-load', async (event, bspName) => {
    // Handle the request to load a BSP file
    const bsp = await new BspReader(fileSystem).load('maps/'+bspName+'.bsp');

    // Useful for development
    fs.writeFileSync(bspName + '.bsp.json', JSON.stringify(bsp, undefined, 2));
    return {basePath, ...bsp};
  });

  ipcMain.handle('file-load', async (event, fileName) => {
    // Handle the request to load a file from the game fs
    const fileContents = await fileSystem.readFile(fileName);
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
