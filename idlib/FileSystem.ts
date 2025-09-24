import path from 'node:path';
import * as unzipper from 'unzipper';

export default class FileSystem {


    filenameToPK3: Map<string, string>;
    basePath: string;

    currentPK3: {pk3name: string, directory: {files: Array<{path: string, buffer: () => Promise<Buffer>}>} | undefined};

    constructor(basePath: string) {
        this.basePath = basePath;
        this.filenameToPK3 = new Map();
        this.currentPK3 = {pk3name: '', directory: undefined}
    }

    findFiles(prefix: string, ext: string): string[] {
        const results: string[] = [];
        for (const [filename, pk3File] of this.filenameToPK3) {
            if (filename.startsWith(prefix) && filename.endsWith(ext)) {
                results.push(filename);
            }
        }
        return results;
    }

    async readFile(filename: string) : Promise<Buffer | undefined> {
        const pk3File = this.filenameToPK3.get(filename);
        if (!pk3File){
            console.error('pk3File ' + pk3File + ' not found for file ' + filename);
            //console.log(this.filenameToPK3)
            return undefined;
        }
        
        if (this.currentPK3.pk3name !== pk3File || !this.currentPK3.directory) {
            this.currentPK3.directory = await unzipper.Open.file(pk3File) as { files: Array<{ path: string, buffer: () => Promise<Buffer> }> };
            this.currentPK3.pk3name = pk3File;
        }
        const directory = this.currentPK3.directory;
        const file = directory?.files.find((d: { path: string }) => d.path === filename);
        if (!file){
            console.error('file ' + filename + ' not found');
            return undefined;
        }
        return await file.buffer();
    }

    async register(pk3Files: string[]): Promise<void> {
        for (const pk3File of pk3Files) {
            try {
                await this.addPK3(path.join(this.basePath, pk3File));
            } catch (error) {
                console.error(`Failed to add ${pk3File}:`, error);
            }
        }
    }

    async addPK3(pk3Path: string): Promise<void> {
        const directory = await unzipper.Open.file(pk3Path);
        for (const file of directory.files) {
            this.filenameToPK3.set(file.path, pk3Path);
        }
    }
}
