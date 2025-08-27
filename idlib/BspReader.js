import { readFile } from 'node:fs/promises';
import path from 'node:path';

const AliceLumpIDs = {
    SHADERS: 0,
    PLANES: 1,
    LIGHTMAPS: 2,
    SURFACES: 3,
    DRAWVERTS: 4,
    DRAWINDICES: 5,
    LEAFBRUSHES: 6,
    LEAFSURFACES: 7,
    LEAFS: 8,
    NODES: 9,
    BRUSHSIDES: 10,
    BRUSHES: 11,
    FOGS: 12,
    MODELS: 13,
    ENTITIES: 14,
    VISIBILITY: 15,
    LIGHTGRID: 16,
    ENTLIGHTS: 17,
    ENTLIGHTSVIS: 18,
    LIGHTDEFS: 19
};

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
        console.log(dv)
        const header = this.readBSPHeader(dv);
        console.log('BSP Header:', header);

        if (this.isAlice(header)) {
            return this.parseAliceBsp(header, dv);
        }
        return {header};
    }

    parseAliceBsp(header, dv) {
        // Parse the Alice BSP data
        const shaders = this.readAliceShaders(dv, header.directories[AliceLumpIDs.SHADERS]);
        const entities = this.readStringLump(dv, header.directories[AliceLumpIDs.ENTITIES]);
        const planes = this.readAlicePlanes(dv, header.directories[AliceLumpIDs.PLANES]);
        const surfaces = this.readAliceSurfaces(dv, header.directories[AliceLumpIDs.SURFACES]);
        const drawVerts = this.readAliceDrawVerts(dv, header.directories[AliceLumpIDs.DRAWVERTS]);
        const drawIndices = this.readUint32ArrayLump(dv, header.directories[AliceLumpIDs.DRAWINDICES]);
        const leafBrushes = this.readUint32ArrayLump(dv, header.directories[AliceLumpIDs.LEAFBRUSHES]);
        const leafSurfaces = this.readUint32ArrayLump(dv, header.directories[AliceLumpIDs.LEAFSURFACES]);
        const leafs = this.readAliceLeafs(dv, header.directories[AliceLumpIDs.LEAFS]);
    
        console.log(leafs)

        return {header, shaders, entities, planes, surfaces, drawVerts, drawIndices, leafBrushes, leafSurfaces, leafs};
    }

    isAlice(header) {
        return header.magic === 'FAKK' && header.version === 42;
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
        let offset = 8;
        if (header.magic == 'FAKK'){
            header.checksum = dv.getUint32(offset, true);
            offset += 4;
        }
        let numDirs = 17;
        if (this.isAlice(header)){
            numDirs = 20;
        }
        for (let i=0; i<numDirs; ++i){
            header.directories.push({
                offset: dv.getUint32(offset, true),
                length: dv.getUint32(offset + 4, true)
            });
            offset += 8;
        }
        return header;
    }

    readUint32ArrayLump(dv, directory){
        const values = [];
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; i += 4) {
            values.push(dv.getUint32(i, true));
        }
        return values;
    }

    readAliceLeafs(dv, directory) {
        const leafs = [];
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; i += 48) {
            leafs.push({
                cluster: dv.getInt32(i, true),
                area: dv.getInt32(i + 4, true),
                mins: [
                    dv.getInt32(i + 8, true),
                    dv.getInt32(i + 12, true),
                    dv.getInt32(i + 16, true)
                ],
                maxs: [
                    dv.getInt32(i + 20, true),
                    dv.getInt32(i + 24, true),
                    dv.getInt32(i + 28, true)
                ],
                firstLeafSurface: dv.getUint32(i + 32, true),
                numLeafSurfaces: dv.getUint32(i + 36, true),
                firstLeafBrush: dv.getUint32(i + 40, true),
                numLeafBrushes: dv.getUint32(i + 44, true)
            });
        }
        return leafs;
    }

    readAliceDrawVerts(dv, directory){
        const drawVerts = [];
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; i += 44) {
            drawVerts.push({
                xyz: this.readVec3(dv, i),
                st: [
                    dv.getFloat32(i+12, true),
                    dv.getFloat32(i+16, true)
                ],
                lightmap: [
                    dv.getFloat32(i+20, true),
                    dv.getFloat32(i+24, true)
                ],
                normal: this.readVec3(dv, i+28),
                colour: [
                    dv.getUint8(i+40, true),
                    dv.getUint8(i+41, true),
                    dv.getUint8(i+42, true),
                    dv.getUint8(i+43, true)
                ]
            });
        }
        return drawVerts;
    }

    readAliceSurfaces(dv, directory) {
        const surfaces = [];
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; i += 108) {
            surfaces.push({
                shaderNum: dv.getUint32(i, true),
                fogNum: dv.getInt32(i + 4, true),
                surfaceType: dv.getUint32(i + 8, true),
                firstVert: dv.getUint32(i + 12, true),
                numVerts: dv.getUint32(i + 16, true),
                firstIndex: dv.getUint32(i + 20, true),
                numIndices: dv.getUint32(i + 24, true),
                lightMapNum: dv.getUint32(i + 28, true),
                lightmapX: dv.getUint32(i + 32, true),
                lightmapY: dv.getUint32(i + 36, true),
                lightMapWidth: dv.getUint32(i + 40, true),
                lightMapHeight: dv.getUint32(i + 44, true),
                lightmapOrigin: this.readVec3(dv, i + 48),
                lightMapVecs: [
                    this.readVec3(dv, i + 60),
                    this.readVec3(dv, i + 72),
                    this.readVec3(dv, i + 84)
                ],
                patchWidth: dv.getUint32(i + 96, true),
                patchHeight: dv.getUint32(i + 100, true),
                subdivisions: dv.getFloat32(i + 104, true)
            });
        }
        return surfaces;
    }

    readVec3(dv, offset) {
        return {
            x: dv.getFloat32(offset, true),
            y: dv.getFloat32(offset + 4, true),
            z: dv.getFloat32(offset + 8, true)
        };
    }

    readAlicePlanes(dv, directory) {
        let planes = [];
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; i += 16) {
            planes.push({
                normal: [
                    dv.getFloat32(i, true),
                    dv.getFloat32(i + 4, true),
                    dv.getFloat32(i + 8, true)
                ],
                distance: dv.getFloat32(i + 12, true)
            });
        }
        return planes;
    }

    readAliceShaders(dv, directory) {
        let shaders = [];
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            let shader = {shader: this.readString(dv, i, 64)}
            i += 64;
            shader.surfaceFlags = dv.getUint32(i, true);
            i += 4;
            shader.contentFlags = dv.getUint32(i, true);
            i += 4;
            shader.subdivisions = dv.getUint32(i, true);
            i += 4;
            shaders.push(shader);
        }
        return shaders;
    }

    readString(dv, start, length) {
        let str = '';
        for (let i = 0; i < length; ++i) {
            const charCode = dv.getUint8(start + i, true);
            if (charCode === 0) break; // Null-terminated
            str += String.fromCharCode(charCode);
        }
        return str;
    }

    readStringLump(dv, directory) {
        let entities = '';
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; ++i) {
            // Horribly inefficient but will do for now
            entities += String.fromCharCode(dv.getUint8(i, true));
        }
        return entities;
    }
}
