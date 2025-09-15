import * as fs from 'fs';
import path from 'node:path';
import * as unzipper from 'unzipper';

export default class FileSystem {

    filenameToPK3: Map<string, string>;
    basePath: string;
    
    constructor(basePath: string) {
        this.basePath = basePath;
        this.filenameToPK3 = new Map();
    }

    async register(pk3Files: string[]) {
        for (const pk3File of pk3Files) {
            try {
                await this.addPK3(path.join(this.basePath, pk3File));
            } catch (error) {
                console.error(`Failed to add ${pk3File}:`, error);
            }
        }
    }

    async addPK3(pk3Path: string) {
        const directory = await unzipper.Open.file(pk3Path);
        for (const file of directory.files) {
            this.filenameToPK3.set(file.path, pk3Path);
        }
    }
}
