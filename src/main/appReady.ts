import { app, BrowserWindow, ipcMain } from 'electron/main';
import { shell } from 'electron';
import { is } from '@electron-toolkit/utils'


import path from 'node:path';
import fs from 'fs';
import BspReader from '../../idlib/BspReader';
import FileSystem from '../../idlib/FileSystem.js';
import ShaderReader from '../../idlib/ShaderReader';
import Preferences from './preferences.js';
import { getGameConfig, GameType } from '../../idlib/GameConfig';

const createWindow = () =>
{
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.mjs'),
            sandbox: false  // Allows hot module reloading
        }
    });

    mainWindow.on('ready-to-show', () =>
    {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler((details) =>
    {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index_webgl.html`)
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index_webgl.html'))
    }

    const devtools = new BrowserWindow()
    mainWindow.webContents.setDevToolsWebContents(devtools.webContents)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
};

export async function appReady(argv: any)
{

    let basePath = undefined;

    console.log('argv', argv);
    if (argv['fs_game']) {
        basePath = argv['fs_game'];
    }

    let gameType = undefined;
    if (argv['game']) {
        gameType = argv['game'];
    }
    console.log('Using game type: ' + gameType);

    let bspName = '';
    if (argv['bsp']) {
        bspName = argv['bsp'];
    }
    console.log('Using bsp: ' + bspName);

    const preferences = new Preferences();
    await preferences.read();

    if (!basePath) {
        basePath = preferences.get('fs_game');
    } else {
        preferences.set('fs_game', basePath);
    }
    if (!gameType) {
        gameType = preferences.get('game');
    } else {
        preferences.set('game', gameType);
    }

    if (!bspName) {
        bspName = preferences.get('bspName');
    } else {
        preferences.set('bspName', bspName);
    }

    await preferences.write();

    if (!basePath) {
        throw new Error('No fs_game specified. Use --fs_game to specify the path to the game data folder.');
    }

    if (!fs.existsSync(basePath)) {
        throw new Error(`The specified fs_game path does not exist: ${basePath}`);
    }

    if (!fs.statSync(basePath).isDirectory()) {
        throw new Error(`The specified fs_game path is not a directory: ${basePath}`);
    }

    console.log(`Using fs_game path: ${basePath}`);
    const fileSystem = new FileSystem(basePath);

    const gameConfig = getGameConfig(gameType as GameType);

    await fileSystem.register(gameConfig.pk3Files);

    ipcMain.handle('game-config', async () =>
    {
        return { gameConfig, bspName };
    });

    ipcMain.handle('bsp-load', async (event, bspName) =>
    {
        // Handle the request to load a BSP file
        const bsp = await new BspReader(fileSystem).load('maps/' + bspName + '.bsp');

        // Useful for development
        fs.writeFileSync(bspName + '.bsp.json', JSON.stringify(bsp, undefined, 2));
        return { basePath, ...bsp };
    });

    ipcMain.handle('file-exists', async (event, fileName) =>
    {
        // Check if the file exists in the game fs
        return fileSystem.fileExists(fileName);
    });

    ipcMain.handle('file-load', async (event, fileName) =>
    {
        // Handle the request to load a file from the game fs
        const fileContents = await fileSystem.readFile(fileName);
        return fileContents;
    });

    ipcMain.handle('shaders-load', async (event, fileName) =>
    {
        const shaderReader = new ShaderReader(fileSystem);
        const shaders = await shaderReader.loadAllShaders();
        return shaders;
    });

    createWindow();

    app.on('activate', () =>
    {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}
