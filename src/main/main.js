import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { app } from 'electron/main';
import { appReady } from './appReady.js';


const argv = yargs(hideBin(process.argv)).parse();

//app.commandLine.appendSwitch('disable-frame-rate-limit');

app.whenReady().then(async () => {
  try {
    await appReady(argv);
  } catch (e) {
    console.error('Error during app initialization', e);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // For development, ignore the mac behavior
  //if (process.platform !== 'darwin') {
  app.quit();
  //}
});
