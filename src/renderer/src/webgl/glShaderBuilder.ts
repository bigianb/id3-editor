import { Shader } from "../../../../idlib/Shaders.types";

interface GLShaderStage {
    texture: WebGLTexture | null;
    blendSrc: number;
    blendDest: number;
    depthFunc: number;
    [key: string]: any;
}

interface GLShader {
    cull: number | null;
    sort: number;
    sky: boolean;
    blend: boolean;
    name: string;
    stages: GLShaderStage[];
    [key: string]: any;
}

export default class GlShaderBuilder {

    gl: WebGLRenderingContextBase;

    constructor(gl: WebGLRenderingContextBase) {
        this.gl = gl;
        console.log('GlShaderBuilder init', gl);
    }

    build(name: string, shader: Shader): GLShader {
        const glShader: GLShader = {
            cull: this.translateCull(shader.cull),
            sort: shader.sort,
            sky: shader.sky,
            blend: shader.blend,
            name: shader.name,
            stages: []
        };

        for (let j = 0; j < shader.stages.length; ++j) {
            const stage = shader.stages[j];
            const glStage = {
                texture: null,
                blendSrc: this.translateBlend(stage.blendSrc),
                blendDest: this.translateBlend(stage.blendDest),
                depthFunc: this.translateDepthFunc(stage.depthFunc)
            };

            glShader.stages.push(glStage);
        }

        return glShader;
    }

    translateDepthFunc(depth: string): number {
        if (!depth) { return this.gl.LEQUAL; }
        switch (depth.toLowerCase()) {
            case 'gequal': return this.gl.GEQUAL;
            case 'lequal': return this.gl.LEQUAL;
            case 'equal': return this.gl.EQUAL;
            case 'greater': return this.gl.GREATER;
            case 'less': return this.gl.LESS;
            default: return this.gl.LEQUAL;
        }
    };

    translateCull(cull: string): number | null {
        if (!cull) { return this.gl.FRONT; }
        switch (cull.toLowerCase()) {
            case 'disable':
            case 'none': return null;
            case 'front': return this.gl.BACK;
            case 'back':
            default: return this.gl.FRONT;

        }
    }

    translateBlend(blend: string): number {
        if (!blend) { return this.gl.ONE; }
        switch (blend.toUpperCase()) {
            case 'GL_ONE': return this.gl.ONE;
            case 'GL_ZERO': return this.gl.ZERO;
            case 'GL_DST_COLOR': return this.gl.DST_COLOR;
            case 'GL_ONE_MINUS_DST_COLOR': return this.gl.ONE_MINUS_DST_COLOR;
            case 'GL_SRC_ALPHA ': return this.gl.SRC_ALPHA;
            case 'GL_ONE_MINUS_SRC_ALPHA': return this.gl.ONE_MINUS_SRC_ALPHA;
            case 'GL_SRC_COLOR': return this.gl.SRC_COLOR;
            case 'GL_ONE_MINUS_SRC_COLOR': return this.gl.ONE_MINUS_SRC_COLOR;
            default: return this.gl.ONE;
        }
    }

};
