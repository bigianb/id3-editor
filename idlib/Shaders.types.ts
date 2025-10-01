
interface TCMod
{
    type: string;
    angle?: number;
    scaleX?: number;
    scaleY?: number;
    sSpeed?: number;
    tSpeed?: number;
    waveform?: any;
    base?: number;
    amplitude?: number;
    phase?: number;
    freq?: number;
}

export interface ShaderStage
{
    clamp: boolean;
    map?: string;
    isLightmap: boolean;
    animFreq: number;
    animMaps: string[];
    hasBlendFunc: boolean;
    blendSrc: string;
    blendDst: string;
    rgbGen: string;
    alphaGen?: string;
    rgbWaveform: any;
    tcGen: string;
    tcMods: TCMod[];
    depthFunc: string;
    depthWrite: boolean;
    depthWriteOverride: boolean;
    lines: string[];
}

export interface Shader
{
    name: string;
    editorImage?: string;
    cull: string;
    sky: boolean;
    blend: boolean;
    opaque: boolean;
    noPicmip: boolean;
    noMipMap: boolean;
    noFog: boolean;
    noCompress: boolean;
    portal?: boolean;
    sort: number;
    surfaceParams: Set<string>;
    params: string[];
    vertexDeforms: any[];
    entityMergable?: boolean;
    polygonOffset?: boolean;
    stages: ShaderStage[];
}