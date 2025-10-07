import {BSP, BSPDirectory, BSPEntity, BSPHeader, BSPShader, BSPVertex} from './BspReader.types.ts';
import FileSystem from './FileSystem.ts';

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


const RtcwLumpIDs = {
    ENTITIES: 0,
    SHADERS: 1,
    PLANES: 2,
    NODES: 3,
    LEAFS: 4,
    LEAFSURFACES: 5,
    LEAFBRUSHES: 6,
    MODELS: 7,
    BRUSHES: 8,
    BRUSHSIDES: 9,
    DRAWVERTS: 10,
    DRAWINDICES: 11,
    FOGS: 12,
    SURFACES: 13,
    LIGHTMAPS: 14,
    LIGHTGRID: 15,
    VISIBILITY: 16
};



export default class BspReader {
    fileSystem: FileSystem;
    constructor(fileSystem: FileSystem) {
        this.fileSystem = fileSystem;
    }

    async load(bspName: string): Promise<BSP | undefined> {
        // Load the BSP file and parse it
        console.log('loading BSP:', bspName);
        const data = await this.fileSystem.readFile(bspName);
        if (!data) {
            return undefined;
        }
        return this.parseBsp(data);
    }

    parseBsp(data: Buffer<ArrayBufferLike>): BSP {
        // Parse the BSP data
        const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const header = this.readBSPHeader(dv);
        //console.log(header)
        if (this.isAlice(header) || this.isFAKK2(header)) {
            return this.parseAliceBsp(header, dv);
        } else if (this.isRTCW(header)) {
            return this.parseRtcwBsp(header, dv);
        }
        return { header };
    }

    parseRtcwBsp(header: BSPHeader, dv: DataView<ArrayBufferLike>): BSP {

        const shaders = this.readRTCWShaders(dv, header.directories[RtcwLumpIDs.SHADERS]);
        const surfaces = this.readRTCWSurfaces(dv, header.directories[RtcwLumpIDs.SURFACES]);
        const drawVerts = this.readDrawVerts(dv, header.directories[RtcwLumpIDs.DRAWVERTS]);
        const drawIndices = this.readUint32ArrayLump(dv, header.directories[RtcwLumpIDs.DRAWINDICES]);
        
        const entities = this.readEntities(dv, header.directories[RtcwLumpIDs.ENTITIES]);
        const planes = this.readPlanes(dv, header.directories[RtcwLumpIDs.PLANES]);

        return { header, shaders, entities, planes, surfaces, drawVerts, drawIndices };
    }

    parseAliceBsp(header: BSPHeader, dv: DataView<ArrayBufferLike>): BSP {
        // Parse the Alice BSP data

        // Used for Drawing
        const shaders = this.readAliceShaders(dv, header.directories[AliceLumpIDs.SHADERS]);
        const surfaces = this.readAliceSurfaces(dv, header.directories[AliceLumpIDs.SURFACES]);
        const drawVerts = this.readDrawVerts(dv, header.directories[AliceLumpIDs.DRAWVERTS]);
        const drawIndices = this.readUint32ArrayLump(dv, header.directories[AliceLumpIDs.DRAWINDICES]);
        // skip LIGHTGRID for now

        // Used for collision etc
        const planes = this.readPlanes(dv, header.directories[AliceLumpIDs.PLANES]);
        const leafBrushes = this.readUint32ArrayLump(dv, header.directories[AliceLumpIDs.LEAFBRUSHES]);
        const leafSurfaces = this.readUint32ArrayLump(dv, header.directories[AliceLumpIDs.LEAFSURFACES]);
        const leafs = this.readAliceLeafs(dv, header.directories[AliceLumpIDs.LEAFS]);
        const nodes = this.readNodes(dv, header.directories[AliceLumpIDs.NODES]);
        const brushSides = this.readBrushSides(dv, header.directories[AliceLumpIDs.BRUSHSIDES]);
        const brushes = this.readBrushes(dv, header.directories[AliceLumpIDs.BRUSHES]);
        const fogs = this.readFogs(dv, header.directories[AliceLumpIDs.FOGS]);
        const models = this.readModels(dv, header.directories[AliceLumpIDs.MODELS]);
        const entities = this.readEntities(dv, header.directories[AliceLumpIDs.ENTITIES]);
        const visibility = this.readVisibility(dv, header.directories[AliceLumpIDs.VISIBILITY]);

        const entLights = this.readEntLights(dv, header.directories[AliceLumpIDs.ENTLIGHTS]);
        const entLightsVis = this.readEntLightsVis(dv, header.directories[AliceLumpIDs.ENTLIGHTSVIS]);
        const lightDefs = this.readLightDefs(dv, header.directories[AliceLumpIDs.LIGHTDEFS]);

        return {
            header, shaders, entities, planes, surfaces,
            drawVerts, drawIndices, leafBrushes, leafSurfaces, leafs, nodes,
            brushSides, brushes, fogs, models, visibility, entLights, entLightsVis, lightDefs
        };
    }

    isAlice(header: BSPHeader) {
        return header.magic === 'FAKK' && header.version === 42;
    }

    isFAKK2(header: BSPHeader) {
        return header.magic === 'FAKK' && header.version === 12;
    }

    isRTCW(header: BSPHeader) {
        return header.magic === 'IBSP' && header.version === 47;
    }

    readBSPHeader(dv: DataView<ArrayBufferLike>) {
        const header: BSPHeader = {
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
        console.log('BSP Header:', header);
        if (header.magic == 'FAKK') {
            header.checksum = dv.getUint32(offset, true);
            offset += 4;
        }
        let numDirs = 17;
        if (this.isAlice(header) || this.isFAKK2(header)) {
            numDirs = 20;
        }
        for (let i = 0; i < numDirs; ++i) {
            header.directories.push({
                offset: dv.getUint32(offset, true),
                length: dv.getUint32(offset + 4, true)
            });
            offset += 8;
        }
        return header;
    }

    readUint32ArrayLump(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const values = [];
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; i += 4) {
            values.push(dv.getUint32(i, true));
        }
        return values;
    }

    readEntities(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const str = this.readStringLump(dv, directory);
        const elements = str.replaceAll("}", "").split("{");
        const entities = [];
        for (const el of elements) {
            const trimmed = el.trim();
            if (trimmed.length > 0) {
                entities.push(this.parseEntity(trimmed));
            }
        }
        return entities;
    }

    parseFloatArray(str: string) {
        return str.split(' ').map(x => Number.parseFloat(x));
    }

    parseEntity(strRep: string) {
        const entity: BSPEntity = {};

        const lines = strRep.split('\n');
        for (const line of lines) {
            const kv = line.split('" "').map(x => x.replaceAll('"', ''));
            if (kv.length != 2) {
                console.error(`Failed to parse entity entry ${line}. Entity is:\n {${strRep}}`);
            } else {
                const key = kv[0];
                let val: number | string | number[] = kv[1];
                if (key === 'origin' || key === '_color' || key === 'angles') {
                    val = this.parseFloatArray(val);
                } else if (key === 'angle' || key === 'scale' || key === 'speed' || key === 'light') {
                    val = Number.parseFloat(val);
                }
                entity[key] = val;
            }
        }

        return entity;
    }

    readVisibility(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const vis: { numClusters: number, clusterBytes: number, vis: number[] } = {
            numClusters: 0,
            clusterBytes: 0,
            vis: []
        };
        if (directory.length > 8) {
            const start = directory.offset;
            vis.numClusters = dv.getInt32(start, true);
            vis.clusterBytes = dv.getInt32(start + 4, true);
            for (let i = start + 8; i < start + directory.length; ++i) {
                vis.vis.push(dv.getUint8(i));
            }
        }

        return vis;
    }

    // I don't understand this but it appears to be all integers
    readEntLightsVis(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const obj: { len: number, data: number[] } = { len: 0, data: [] };
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            obj.data.push(
                dv.getInt32(i, true),
            );
            obj.len += 1;
            i += 4;
        }
        return obj;
    }

    // mapspherel_t
    readEntLights(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const objs = [];
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            objs.push({
                origin: this.readVec3(dv, i),
                colour: this.readVec3(dv, i + 12),
                intensity: dv.getFloat32(i + 24, true),
                leaf: dv.getInt32(i + 28, true),
                needs_trace: dv.getInt32(i + 32, true),
                spot_light: dv.getInt32(i + 36, true),
                spot_dir: this.readVec3(dv, i + 40),
                spot_radiusbydistance: dv.getFloat32(i + 52, true),
                unknown: dv.getInt32(i + 56, true)
            });
            i += 15 * 4;
        }
        return objs;
    }

    readLightDefs(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const objs = [];
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            objs.push({
                lightIntensity: dv.getInt32(i, true),
                lightAngle: dv.getInt32(i + 4, true),
                lightmapResolution: dv.getInt32(i + 8, true),
                twoSided: dv.getInt32(i + 12, true) != 0,
                lightLinear: dv.getInt32(i + 16, true) != 0,
                lightColor: this.readVec3(dv, i + 20),
                lightFalloff: dv.getFloat32(i + 32, true),
                backsplashFraction: dv.getFloat32(i + 36, true),
                backsplashDistance: dv.getFloat32(i + 40, true),
                lightSubdivide: dv.getFloat32(i + 44, true),
                autosprite: dv.getInt32(i + 48, true) != 0,
            });
            i += 52;
        }
        return objs;
    }

    readModels(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const objs = [];
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            objs.push({
                mins: [
                    dv.getFloat32(i, true),
                    dv.getFloat32(i + 4, true),
                    dv.getFloat32(i + 8, true)
                ],
                maxs: [
                    dv.getFloat32(i + 12, true),
                    dv.getFloat32(i + 16, true),
                    dv.getFloat32(i + 20, true)
                ],
                firstSurface: dv.getInt32(i + 24, true),
                numSurfaces: dv.getInt32(i + 28, true),
                firstBrush: dv.getInt32(i + 32, true),
                numBrushes: dv.getInt32(i + 36, true)
            });
            i += 40;
        }
        return objs;
    }

    readFogs(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const objs = [];
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            objs.push({
                shader: this.readString(dv, i, 64),
                brushNum: dv.getInt32(i + 64, true),
                visibleSide: dv.getInt32(i + 68, true)
            });
            i += 72;
        }
        return objs;
    }

    readBrushes(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const objs = [];
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            objs.push({
                firstSide: dv.getInt32(i, true),
                numSides: dv.getInt32(i + 4, true),
                shaderNum: dv.getInt32(i + 4, true)
            });
            i += 12;
        }
        return objs;
    }

    readBrushSides(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const objs = [];
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            objs.push({
                planeNum: dv.getInt32(i, true),
                shaderNum: dv.getInt32(i + 4, true)
            });
            i += 8;
        }
        return objs;
    }

    readNodes(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const nodes = [];
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; i += 9 * 4) {
            nodes.push({
                planeNum: dv.getInt32(i, true),
                Children: [
                    dv.getInt32(i + 4, true),
                    dv.getInt32(i + 8, true),
                ],
                mins: [
                    dv.getInt32(i + 12, true),
                    dv.getInt32(i + 16, true),
                    dv.getInt32(i + 20, true)
                ],
                maxs: [
                    dv.getInt32(i + 24, true),
                    dv.getInt32(i + 28, true),
                    dv.getInt32(i + 32, true)
                ],
            });
        }
        return nodes;
    }

    readAliceLeafs(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
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

    readDrawVerts(dv: DataView<ArrayBufferLike>, directory: BSPDirectory): BSPVertex[] {
        const drawVerts:BSPVertex[] = [];
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; i += 44) {
            drawVerts.push({
                xyz: this.readVec3(dv, i),
                st: [
                    dv.getFloat32(i + 12, true),
                    dv.getFloat32(i + 16, true)
                ],
                lightmap: [
                    dv.getFloat32(i + 20, true),
                    dv.getFloat32(i + 24, true)
                ],
                normal: this.readVec3(dv, i + 28),
                colour: [
                    dv.getUint8(i + 40),
                    dv.getUint8(i + 41),
                    dv.getUint8(i + 42),
                    dv.getUint8(i + 43)
                ]
            });
        }
        return drawVerts;
    }

    readRTCWSurfaces(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        return this.readSurfaces(dv, directory, false);
    }

    readAliceSurfaces(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        return this.readSurfaces(dv, directory, true);
    }

    readSurfaces(dv: DataView<ArrayBufferLike>, directory: BSPDirectory, hasSubdivisions: boolean) {
        const surfaces = [];
        const start = directory.offset;
        const end = start + directory.length;
        const stride = hasSubdivisions ? 108 : 104;
        for (let i = start; i < end; i += stride) {
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
                subdivisions: hasSubdivisions ? dv.getFloat32(i + 104, true) : 0
            });
        }
        return surfaces;
    }

    readVec3(dv: DataView<ArrayBufferLike>, offset: number) {
        return {
            x: dv.getFloat32(offset, true),
            y: dv.getFloat32(offset + 4, true),
            z: dv.getFloat32(offset + 8, true)
        };
    }

    readPlanes(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        const planes = [];
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

    readAliceShaders(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        return this.readShaders(dv, directory, true);
    }

    readRTCWShaders(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        return this.readShaders(dv, directory, false);
    }

    readShaders(dv: DataView<ArrayBufferLike>, directory: BSPDirectory, hasSubdivisions: boolean) {
        const shaders: BSPShader[] = [];
        const start = directory.offset;
        const end = start + directory.length;
        let i = start;
        while (i < end) {
            const shader: BSPShader = {
                shader: this.readString(dv, i, 64),
                surfaceFlags: dv.getUint32(i + 64, true),
                contentFlags: dv.getUint32(i + 68, true),
                subdivisions: hasSubdivisions ? dv.getUint32(i + 72, true) : 0,
                surfaces: [],
                indexOffset: 0,
                indexCount: 0
            };
            shaders.push(shader);
            if (hasSubdivisions) {
                i += 76;
            } else {
                i += 72;
            }
        }
        return shaders;
    }

    readString(dv: DataView<ArrayBufferLike>, start: number, length: number) {
        let str = '';
        for (let i = 0; i < length; ++i) {
            const charCode = dv.getUint8(start + i);
            if (charCode === 0) break; // Null-terminated
            str += String.fromCharCode(charCode);
        }
        return str;
    }

    readStringLump(dv: DataView<ArrayBufferLike>, directory: BSPDirectory) {
        let entities = '';
        const start = directory.offset;
        const end = start + directory.length;
        for (let i = start; i < end; ++i) {
            // Horribly inefficient but will do for now
            entities += String.fromCharCode(dv.getUint8(i));
        }
        return entities;
    }
}
