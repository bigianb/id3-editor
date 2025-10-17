import { beforeEach, describe, it, expect, vi } from 'vitest';
import { BSPSurface, BSPVertex } from './BspReader.types';
import { tesselate } from './Tesselation';

describe('Tesselation', () =>
{

    const vertexData:BSPVertex[] = [
        { xyz: { x: -3296, y: 960,  z: 304 }, st: [7.5,  -2.375], lightmap: [0.92578125, 0.49609375], normal: { x: -1, y: 0, z: 0 }, colour: [31, 24, 18, 255] },
        { xyz: { x: -3296, y: 1008, z: 288 }, st: [7.875, -2.25], lightmap: [0.95703125, 0.49609375], normal: { x: -1, y: 0, z: 0 }, colour: [26, 21, 16, 255] },
        { xyz: { x: -3296, y: 1008, z: 288 }, st: [7.875, -2.25], lightmap: [0.95703125, 0.49609375], normal: { x: -1, y: 0, z: 0 }, colour: [26, 21, 16, 255] },
        
        { xyz: { x: -3296, y: 1008, z: 288 }, st: [7.875, -2.25], lightmap: [0.92578125, 0.52734375], normal: { x: -1, y: 0, z: 0 }, colour: [26, 21, 16, 255] },
        { xyz: { x: -3296, y: 1008, z: 288 }, st: [7.875, -2.25], lightmap: [0.95703125, 0.52734375], normal: { x: -1, y: 0, z: 0 }, colour: [26, 21, 16, 255] },
        { xyz: { x: -3296, y: 1008, z: 288 }, st: [7.875, -2.25], lightmap: [0.95703125, 0.52734375], normal: { x: -1, y: 0, z: 0 }, colour: [26, 21, 16, 255] },
        
        { xyz: { x: -3296, y: 1008, z: 256 }, st: [7.875, -2],    lightmap: [0.92578125, 0.54296875], normal: { x: -1, y: 0, z: 0 }, colour: [24, 19, 15, 255] },
        { xyz: { x: -3296, y: 1008, z: 288 }, st: [7.875, -2.25], lightmap: [0.95703125, 0.54296875], normal: { x: -1, y: 0, z: 0 }, colour: [26, 21, 16, 255] },
        { xyz: { x: -3296, y: 1008, z: 288 }, st: [7.875, -2.25], lightmap: [0.95703125, 0.54296875], normal: { x: -1, y: 0, z: 0 }, colour: [26, 21, 16, 255] }
    ];

    it('tesselates level 2', () => {
        const indices:number[] = [];
        const vertices = [...vertexData];
        const face:BSPSurface = {
            shaderNum: 0,
            fogNum: 0,
            surfaceType: 0,
            firstVert: 0,
            numVerts: 9,
            firstIndex: 0,
            numIndices: 0,
            lightMapNum: 0,
            lightmapX: 0,
            lightmapY: 0,
            lightMapWidth: 0,
            lightMapHeight: 0,
            lightmapOrigin: { x: 0, y: 0, z: 0 },
            lightMapVecs: [],
            patchWidth: 3,
            patchHeight: 3,
            subdivisions: 0
        };
        tesselate(face, vertices, indices, 2);

        expect(indices.length).toBe(24);
        expect(vertices.length).toBe(9 + 9);

        console.log(indices);
        console.log(vertices);
    });
});
