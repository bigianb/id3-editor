import { readFile } from 'node:fs/promises';
import path from 'node:path';

export default class BspReader {
    constructor(basePath) {
        this.basePath = basePath;
    }

    async load(bspName) {
        // Load the BSP file and parse it
        console.log('loading BSP:', bspName, ' from ', this.basePath);
        const filePath = path.join(this.basePath, 'maps', `${bspName}.bsp`);
        const data = await readFile(filePath);
        return this.parseBsp(data);
    }

    parseBsp(data) {
        // Parse the BSP data
        const dv = new DataView(data.buffer);
        const header = this.readBSPHeader(dv);
        console.log('BSP Header:', header);
        return {header};
    }

    readBSPHeader(dv){
        const header = {
            magic: String.fromCharCode(
                dv.getUint8(0),
                dv.getUint8(1),
                dv.getUint8(2),
                dv.getUint8(3)
            ),
            version: dv.getUint32(4, true),
            directories: []
        };
        for (let i=0; i<17; ++i){
            header.directories.push({
                offset: dv.getUint32(8 + i * 8, true),
                length: dv.getUint32(12 + i * 8, true)
            });
        }
        return header;
    }
}
