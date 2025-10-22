export type BSPEntity = {
    [key: string]: number | string | number[] | undefined;
};

export type BSPSurface = {
    shaderNum: number,
    fogNum: number,
    surfaceType: number,
    firstVert: number,
    numVerts: number,
    firstIndex: number,
    numIndices: number,
    lightMapNum: number,
    lightmapX: number,
    lightmapY: number,
    lightMapWidth: number,
    lightMapHeight: number,
    lightmapOrigin: { x: number, y: number, z: number; },
    lightMapVecs: { x: number, y: number, z: number; }[],
    patchWidth: number,
    patchHeight: number,
    subdivisions: number;
};

export type BSPShader = {
    surfaceType?: number;
    shader: string,
    surfaceFlags: number,
    contentFlags: number,
    subdivisions: number,
    // Not stored in the BSP but useful to track when drawing.
    surfaces: BSPSurface[],
    indexOffset: number,
    indexCount: number;
};

export type BSPDirectory = {
    offset: number,
    length: number;
};

export type BSPHeader = {
    magic: string,
    version: number,
    checksum?: number,
    directories: BSPDirectory[];
};

export type BSPLightmap = {
    x: number,
    y: number,
    width: number,
    height: number,
    bytes: Uint8Array;
};

export type BSPLightmapRect = {
    x: number,
    y: number,
    xScale: number,
    yScale: number;
};

export type BSPVertex = {
    xyz: { x: number, y: number, z: number; },
    st: [number, number],
    lightmap: [number, number],
    lmNewCoord: [number, number],
    normal: { x: number, y: number, z: number; },
    colour: [number, number, number, number];
};

export type BSPBrush = {
    firstSide: number,
    numSides: number,
    shaderNum: number;
};

export interface BSP
{
    header: BSPHeader,
    shaders?: BSPShader[],
    entities?: BSPEntity[],
    planes?: { normal: number[], distance: number; }[],
    surfaces?: BSPSurface[],
    drawVerts?: BSPVertex[],
    lightmapTextureSize: number,
    lightmaps: BSPLightmap[],
    lightmapRects?: BSPLightmapRect[],
    drawIndices?: number[],
    leafBrushes?: number[],
    leafSurfaces?: number[],
    leafs?: {
        cluster: number,
        area: number,
        mins: [number, number, number],
        maxs: [number, number, number],
        firstLeafSurface: number,
        numLeafSurfaces: number,
        firstLeafBrush: number,
        numLeafBrushes: number;
    }[],
    nodes?: {
        planeNum: number,
        Children: [number, number],
        mins: [number, number, number],
        maxs: [number, number, number];
    }[],
    brushSides?: {
        planeNum: number,
        shaderNum: number;
    }[],
    brushes?: BSPBrush[],
    fogs?: {
        shader: string,
        brushNum: number,
        visibleSide: number;
    }[],
    models?: {
        mins: [number, number, number],
        maxs: [number, number, number],
        firstSurface: number,
        numSurfaces: number,
        firstBrush: number,
        numBrushes: number;
    }[],
    visibility?: {
        numClusters: number,
        clusterBytes: number,
        vis: number[];
    },
    entLights?: {
        origin: { x: number, y: number, z: number; },
        colour: { x: number, y: number, z: number; },
        intensity: number,
        leaf: number,
        needs_trace: number,
        spot_light: number,
        spot_dir: { x: number, y: number, z: number; },
        spot_radiusbydistance: number,
        unknown: number;
    }[],
    entLightsVis?: {
        len: number,
        data: number[];
    },
    lightDefs?: {
        lightIntensity: number,
        lightAngle: number,
        lightmapResolution: number,
        twoSided: boolean,
        lightLinear: boolean,
        lightColor: { x: number, y: number, z: number; },
        lightFalloff: number,
        backsplashFraction: number,
        backsplashDistance: number,
        lightSubdivide: number,
        autosprite: boolean,
    }[];
};
