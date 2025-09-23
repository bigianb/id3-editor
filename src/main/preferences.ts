const { app } = require('electron')
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export default class Preferences {

    preferences: Map<string, any> = new Map();

    /**
     * Reads preferences from the preferences.json file in the user data directory.
     */
    async read() {
        const userData: string = app.getPath('userData');
        console.log('User data path: ' + userData);
        const prefPath = path.join(userData, 'preferences.json');
        const fsStat = await stat(prefPath);
        if (fsStat.isFile()) {
            const data = await readFile(prefPath, 'utf-8');
            this.preferences = new Map(Object.entries(JSON.parse(data)));
        } else {
            this.preferences = new Map();
        }
    }

    /**
     * Writes preferences to the preferences.json file in the user data directory.
     */
    async write() {
        const userData: string = app.getPath('userData');
        const fsStat = await stat(userData);
        if (!fsStat.isDirectory()) {
            const dirCreation = await mkdir(userData, { recursive: true });
            if (!dirCreation){
                throw new Error(`Could not create User data path ${userData}.`);
            }
        }
        const prefPath = path.join(userData, 'preferences.json');
        await writeFile(prefPath, JSON.stringify(Object.fromEntries(this.preferences), null, 2));
    }

    /**
     * Gets a preference value by key.
     * @param key The preference key.
     * @returns The preference value or undefined if not found.
     */
    get(key: string): any | undefined {
        return this.preferences.get(key);
    }
     
    set(key: string, value: any): void {
        this.preferences.set(key, value);
    }

    delete(key: string): void {
        this.preferences.delete(key);
    }

}