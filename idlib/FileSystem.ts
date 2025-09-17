import * as fs from 'fs';
import path from 'node:path';
import * as unzipper from 'unzipper';

export default class FileSystem {

    filenameToPK3: Map<string, string>;
    basePath: string;
    
    // Cache the current open pk3 file.
    currentPK3: {pk3name: string, directory: unzipper.CentralDirectory | undefined};

    constructor(basePath: string) {
        this.basePath = basePath;
        this.filenameToPK3 = new Map();
        this.currentPK3 = {pk3name: '', directory: undefined}
    }

    async readFile(filename: string) {
        const pk3File = this.filenameToPK3.get(filename);
        if (!pk3File){
            console.error('pk3File ' + pk3File + ' not found');
            console.log(this.filenameToPK3)
            return undefined;
        }
        
        if (this.currentPK3.pk3name !== pk3File || !this.currentPK3.directory) {
            this.currentPK3.directory = await unzipper.Open.file(pk3File);
            this.currentPK3.pk3name = pk3File;
        }
        const directory = this.currentPK3.directory;
        const file = directory.files.find(d => d.path === filename);
        if (!file){
            console.error('file ' + filename + ' not found');
            return undefined;
        }
        return await file.buffer();
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
