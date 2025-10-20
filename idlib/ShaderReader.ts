import FileSystem from './FileSystem.ts';
import { Shader, ShaderStage } from './Shaders.types.ts';

export default class ShaderReader {
    fileSystem: FileSystem;

    constructor(fileSystem: FileSystem) {
        this.fileSystem = fileSystem;
    }

    async loadAllShaders(): Promise<Map<string, Shader>> {
        const shaderFiles = this.fileSystem.findFiles('scripts/', '.shader');
        return this.loadShaders(shaderFiles);
    }

    async loadShaders(shaderFiles: string[]): Promise<Map<string, Shader>> {
        const allShaders: Map<string, Shader> = new Map();
        for (const shaderFile of shaderFiles) {
            const shaders = await this.load(shaderFile);
            if (shaders) {
                for (const [name, shader] of shaders) {
                    allShaders.set(name, shader);
                }
            }
        }
        return allShaders;
    }

    async load(shaderName: string): Promise<Map<string, Shader> | undefined> {
        // Load the Shader file and parse it
        const data = await this.fileSystem.readFile(shaderName);
        if (!data) {
            return undefined;
        }
        const shaders = this.extractShaders(data);
        if (!shaders) {
            console.warn('Failed to parse shader file:', shaderName);
            return undefined;
        }

        return shaders;
    }

    parseWaveform(tokens: string[]) {
        if (tokens.length < 5) {
            console.warn('Invalid waveform definition:', tokens);
            return null;
        }
        const func = tokens[0].toLowerCase();
        const base = parseFloat(tokens[1]);
        const amplitude = parseFloat(tokens[2]);
        const phase = parseFloat(tokens[3]);
        const frequency = parseFloat(tokens[4]);

        if (isNaN(base) || isNaN(amplitude) || isNaN(phase) || isNaN(frequency)) {
            console.warn('Invalid waveform parameters:', tokens);
            return null;
        }

        return { func, base, amplitude, phase, frequency };
    }


    addLineToShader(shader: Shader, line: string) {
        const parts = line.split(/\s+/);
        const param0 = parts[0].toLowerCase();
        if (param0 === 'cull' && parts.length > 1) {
            shader.cull = parts[1];
            return;
        }

        if (param0 === 'sort' && parts.length > 1) {
            const sortVal = parseInt(parts[1]);
            if (!isNaN(sortVal)) {
                shader.sort = sortVal;
            } else {
                const param1 = parts[1].toLowerCase();
                switch (param1) {
                    case 'portal': shader.sort = 1; break;
                    case 'sky': shader.sort = 2; break;
                    case 'opaque': shader.sort = 3; break;
                    case 'decal': shader.sort = 4; break;
                    case 'seethrough': shader.sort = 5; break;
                    case 'banner': shader.sort = 6; break;
                    case 'underwater': shader.sort = 8; break;
                    case 'additive': shader.sort = 9; break;
                    case 'nearest': shader.sort = 16; break;
                    
                    default: console.warn('Unknown sort value:', param1); break;
                };
            }
            return;
        }
        if (param0 === 'surfaceparm' && parts.length > 1) {
            const param1 = parts[1].toLowerCase();
            if (param1 === 'sky') {
                shader.sky = true;
            }
            shader.surfaceParams.add(param1);
            return;
        }
        if (param0 === 'spritegen' && parts.length > 1) {
            shader.spritegen = parts[1].toLowerCase();
            return;
        }
        if (param0 === 'qer_editorimage') {
            shader.editorImage = parts[1];
            return;
        }
        if (param0 === 'nopicmip') {
            shader.noPicmip = true;
            return;
        }
        if (param0 == 'portal') {
            shader.portal = true;
            return;
        }
        if (param0 == 'portalsky') {
            shader.portalSky = true;
            return;
        }
        if (param0 === 'nomipmap' || param0 === 'nomipmaps') {
            shader.noMipMap = true;
            return;
        }
        if (param0 === 'nofog') {
            shader.noFog = true;
            return;
        }
        if (param0 === 'nocompress') {
            shader.noCompress = true;
            return;
        }
        if (param0 === 'allowcompress') {
            shader.noCompress = false;
            return;
        }
        if (param0 === 'entitymergable') {
            shader.entityMergable = true;
            return;
        }
        if (param0 === 'polygonoffset') {
            shader.polygonOffset = true;
            return;
        }
        if (param0 === 'deformvertexes' && parts.length > 1) {
            const type = parts[1].toLowerCase();

            switch (type) {
                case 'wave':
                    {
                        const deform = {
                            type: 'wave',
                            spread: 1.0 / parseFloat(parts[2]),
                            waveform: this.parseWaveform(parts.slice(3))
                        }
                        shader.vertexDeforms.push(deform);
                    }
                    break;
                case 'autosprite':
                case 'autosprite2':
                case 'bulge':
                case 'move':
                case 'normal':
                case 'projectionshadow':
                case 'wavenormal':
                    // TODO: implement other deform types
                    break;
                default: {
                    console.warn('Unknown deform type:', type);
                }
            }
            return
        }
        if (param0 === 'fogonly' || param0 === 'fogparms' || param0 === 'fogvars' || param0 === 'skyfogvars') {
            // TODO: handle fogparms
            return;
        }
        if (param0 === 'skyparms'){
            // TODO: Alice thing - need to figure out how to deal with it.
            return;
        }
        if (param0 === 'surfacecolor'){
            // TODO: Alice sky thing - need to figure out how to deal with it.
            return;
        }
        if (param0 === 'surfacelight'){
            // TODO: Alice lava thing - need to figure out how to deal with it.
            return;
        }
        if (param0 === 'tesssize'){
            return; // RTCW ignores this. Probably editor specific.
        }
        if (param0.startsWith('q3map_')) {
            // Ignore q3map specific parameters
            return;
        }
        if (param0.startsWith('qer_')) {
            // Ignore editor specific parameters
            return;
        }
        // Otherwise, just store the line for later processing
        console.log('Unparsed shader line:', line);
        shader.params.push(line);
    }

    addLineToStage(stage: ShaderStage, line: string) {
        const parts = line.split(/\s+/);
        const param0 = parts[0].toLowerCase();
        switch (param0) {
            case 'alphafunc':
                stage.alphaFunc = parts[1]?.toUpperCase();
                break;
            case 'alphagen':
                stage.alphaGen = parts[1]?.toLowerCase();
                switch(stage.alphaGen) {
                    case 'wave':
                        stage.alphaWaveform = this.parseWaveform(parts.slice(2));
                        if(!stage.alphaWaveform) { stage.alphaGen = '1.0'; }
                        break;
                    default: break;
                };
                break;
            case 'alphatest':
                stage.alphaTest = { operator: parts[1]?.toLowerCase(), value: parseFloat(parts[2]) };
                break;
            case 'animmap':
            case 'animmapcomp':
                stage.map = 'anim';
                stage.animFreq = parseFloat(parts[1]);
                stage.animMaps = parts.slice(2);
                break;
            case 'animmapnocomp':
                // skip textures for no compression. They are just small versions of the animmapcomp.
                break;
            case 'blendfunc':
                stage.hasBlendFunc = true;
                if(!stage.depthWriteOverride) {
                    stage.depthWrite = false;
                }
                switch (parts[1]?.toLowerCase()) {
                    case 'add':
                        stage.blendSrc = 'GL_ONE';
                        stage.blendDst = 'GL_ONE';
                        break;
                    case 'filter':
                        stage.blendSrc = 'GL_DST_COLOR';
                        stage.blendDst = 'GL_ZERO';
                        break;
                    case 'blend':
                        stage.blendSrc = 'GL_SRC_ALPHA';
                        stage.blendDst = 'GL_ONE_MINUS_SRC_ALPHA';
                        break;
                    default:
                        stage.blendSrc = parts[1];
                        stage.blendDst = parts[2];
                        break;
                }
                break;
            case 'clampmap':
                stage.clamp = true;
                stage.map = parts[1];
                stage.isLightmap = stage.map === '$lightmap';
                break;
            case 'depthfunc':
                stage.depthFunc = parts[1]?.toLowerCase();
                break;
            case 'depthwrite':
                stage.depthWrite = true;
                stage.depthWriteOverride = true;
                break;
            case 'detail':
                stage.detail = true;
                break;
            case 'map':
            case 'mapcomp':
                stage.map = parts[1];
                stage.isLightmap = stage.map === '$lightmap';
                break;
            case 'mapnocomp':
                // skip textures for no compression. They are just small versions of the mapcomp.
                break;
            case 'nodepthtest':
                stage.noDepthTest = true;
                break;
            case 'rgbgen':
                stage.rgbGen = parts[1]?.toLowerCase();
                switch (stage.rgbGen) {
                    case 'wave':
                        stage.rgbWaveform = this.parseWaveform(parts.slice(2))
                        if (!stage.rgbWaveform) { stage.rgbGen = 'identity'; }
                        break;
                };
                break;
            case 'tcgen':
                stage.tcGen = parts[1];
                break;
            case 'tcmod':
                switch (parts[1]?.toLowerCase()) {
                    case 'rotate':
                        stage.tcMods.push({ type: 'rotate', angle: parseFloat(parts[2]) * (3.1415 / 180) });
                        break;
                    case 'scale':
                        stage.tcMods.push({ type: 'scale', scaleX: parseFloat(parts[2]), scaleY: parseFloat(parts[3]) });
                        break;
                    case 'scroll':
                        stage.tcMods.push({ type: 'scroll', sSpeed: parseFloat(parts[2]), tSpeed: parseFloat(parts[3]) });
                        break;
                    case 'stretch':
                        stage.tcMods.push({ type: 'stretch', waveform: this.parseWaveform(parts.slice(2)) });
                        break;
                    case 'turb':
                        stage.tcMods.push({ type: 'turb', base: parseFloat(parts[2]), amplitude: parseFloat(parts[3]), phase: parseFloat(parts[4]), freq: parseFloat(parts[5]) });
                        break;
                }
                break;
            default:
                console.log('Unparsed stage line:', line);
                stage.lines.push(line);
        }
    }

    extractShaders(data: Buffer): Map<string, Shader> | null {
        const text = data.toString('utf-8');
        const lines = text.split('\n').map(line => line.trim());
        const shaders: Map<string, Shader> = new Map();

        let currentShader: Shader | null = null;
        let currentStage: ShaderStage | null = null;

        let depth = 0;

        for (const line of lines) {
            if (line.startsWith('//') || line === '') {
                continue; // Skip comments and empty lines
            }
            if (!currentShader) {
                currentShader = {
                    name: line,
                    params: [],
                    surfaceParams: new Set<string>(),
                    cull: 'back',
                    sky: false,
                    portal: false,
                    portalSky: false,
                    noPicmip: false,
                    noMipMap: false,
                    noFog: false,
                    noCompress: false,
                    blend: false,
                    opaque: false,
                    sort: 0,
                    vertexDeforms: [],
                    stages: []
                };
                shaders.set(currentShader.name, currentShader);
                continue;
            }
            if (line.startsWith('{')) {
                depth++;
                if (depth === 3) {
                    // We see this in rtcw. It's a bad shader. A closing brace is commented out.
                    // assume the last stage is done.
                    depth = 2;
                }
                const rest = line.substring(1).trim();
                if (depth === 1 && rest.length > 0) {
                    this.addLineToShader(currentShader, rest);
                }
                if (depth === 2) {
                    currentStage = {
                        clamp: false,
                        isLightmap: false,
                        detail: false,
                        noDepthTest: false,
                        tcMods: [],
                        tcGen: 'base',
                        rgbGen: 'identity',
                        rgbWaveform: null,
                        alphaGen: '1.0',
                        alphaWaveform: null,
                        blendSrc: 'GL_ONE', 
                        blendDst: 'GL_ZERO',
                        hasBlendFunc: false,
                        animMaps: [],
                        animFreq: 0,
                        depthFunc: 'lequal',
                        depthWrite: true,
                        depthWriteOverride: false,

                        lines: []
                    };
                    if (rest.length > 0 && !rest.startsWith('//')) {
                        this.addLineToStage(currentStage, rest);
                    }
                    currentShader.stages.push(currentStage);
                }
            } else if (line === '}') {
                depth--;
                if (depth === 0) {
                    currentShader = null;
                } else if (depth === 1 && currentStage !== null) {
                    if (currentStage.blendSrc === 'GL_ONE' && currentStage.blendDst === 'GL_ZERO') {
                        currentStage.hasBlendFunc = false;
                        currentStage.depthWrite = true;
                    }

                    currentStage.isLightmap = currentStage.map === '$lightmap';
                    currentStage = null;
                }
            } else if (depth === 1) {
                this.addLineToShader(currentShader, line);
            } else if (depth === 2) {
                if (!currentStage) {
                    console.warn('No current stage at depth 2 for line:', line);
                    return null;
                }
                this.addLineToStage(currentStage, line);
            } else {
                console.warn('Unexpected line depth ' + depth + ' outside of shader/stage:', line);

                return null;
            }
        }

        return shaders;
    }
}
