import { Shader, ShaderStage } from "../../../../idlib/Shaders.types";

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
                blendDest: this.translateBlend(stage.blendDst),
                depthFunc: this.translateDepthFunc(stage.depthFunc),
                vertexShaderSource: this.buildVertexShader(shader, stage),
                fragmentShaderSource: ''
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

    buildVertexShader(shader: Shader, stage: ShaderStage): string {
        const builder = new ShaderProgramBuilder();

        builder.addAttributes({
            position: 'vec3',
            normal: 'vec3',
            color: 'vec4',
        });

        builder.addVaryings({
            vTexCoord: 'vec2',
            vColor: 'vec4',
        });

        builder.addUniforms({
            modelViewMat: 'mat4',
            projectionMat: 'mat4',
            time: 'float',
        });

        if (stage.isLightmap) {
            builder.addAttributes({ lightCoord: 'vec2' });
        } else {
            builder.addAttributes({ texCoord: 'vec2' });
        }

        builder.addLines(['vec3 defPosition = position;']);
        for (const [i, deform] of shader.vertexDeforms.entries()) {
            switch (deform.type) {
                case 'wave':
                    {
                        const name = 'deform' + i;
                        const offName = 'deformOff' + i;

                        builder.addLines([
                            'float ' + offName + ' = (position.x + position.y + position.z) * ' + deform.spread.toFixed(4) + ';'
                        ]);

                        const phase = deform.waveform.phase;
                        deform.waveform.phase = phase.toFixed(4) + ' + ' + offName;
                        builder.addWaveform(name, deform.waveform);
                        deform.waveform.phase = phase;

                        builder.addLines(['defPosition += normal * ' + name + ';']);
                    }
                    break;
                default:
                    break;
            }
        }

        builder.addLines(['vec4 worldPosition = modelViewMat * vec4(defPosition, 1.0);']);
        builder.addLines(['vColor = color;']);

        if (stage.tcGen == 'environment') {
            builder.addLines([
                'vec3 viewer = normalize(-worldPosition.xyz);',
                'float d = dot(normal, viewer);',
                'vec3 reflected = normal*2.0*d - viewer;',
                'vTexCoord = vec2(0.5, 0.5) + reflected.xy * 0.5;'
            ]);
        } else {
            // Standard texturing
            if (stage.isLightmap) {
                builder.addLines(['vTexCoord = lightCoord;']);
            } else {
                builder.addLines(['vTexCoord = texCoord;']);
            }
        }

        for (const [i, tcMod] of stage.tcMods.entries()) {
            switch (tcMod.type) {
                case 'rotate':
                    builder.addLines([
                        'float r = ' + tcMod.angle?.toFixed(4) + ' * time;',
                        'vTexCoord -= vec2(0.5, 0.5);',
                        'vTexCoord = vec2(vTexCoord.s * cos(r) - vTexCoord.t * sin(r), vTexCoord.t * cos(r) + vTexCoord.s * sin(r));',
                        'vTexCoord += vec2(0.5, 0.5);',
                    ]);
                    break;
                case 'scroll':
                    builder.addLines([
                        'vTexCoord += vec2(' + tcMod.sSpeed?.toFixed(4) + ' * time, ' + tcMod.tSpeed?.toFixed(4) + ' * time);'
                    ]);
                    break;
                case 'scale':
                    builder.addLines([
                        'vTexCoord *= vec2(' + tcMod.scaleX?.toFixed(4) + ', ' + tcMod.scaleY?.toFixed(4) + ');'
                    ]);
                    break;
                case 'stretch':
                    builder.addWaveform('stretchWave', tcMod.waveform);
                    builder.addLines([
                        'stretchWave = 1.0 / stretchWave;',
                        'vTexCoord *= stretchWave;',
                        'vTexCoord += vec2(0.5 - (0.5 * stretchWave), 0.5 - (0.5 * stretchWave));',
                    ]);
                    break;
                case 'turb':
                    {
                        const tName = 'turbTime' + i;
                        builder.addLines([
                            'float ' + tName + ' = ' + tcMod.phase?.toFixed(4) + ' + time * ' + tcMod.freq?.toFixed(4) + ';',
                            'vTexCoord.s += sin( ( ( position.x + position.z )* 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.amplitude?.toFixed(4) + ';',
                            'vTexCoord.t += sin( ( position.y * 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.amplitude?.toFixed(4) + ';'
                        ]);
                    }
                    break;
                default: break;
            }
        }

        switch (stage.alphaGen) {
            case 'lightingspecular':
                builder.addAttributes({ lightCoord: 'vec2' });
                builder.addVaryings({ vLightCoord: 'vec2' });
                builder.addLines(['vLightCoord = lightCoord;']);
                break;
            default:
                break;
        }

        builder.addLines(['gl_Position = projectionMat * worldPosition;']);

        return builder.build();
    }

};

class ShaderProgramBuilder {
    attributes: string[] = [];
    uniforms: string[] = [];
    varyings: string[] = [];
    statements: string[] = [];
    functions: string[] = [];

    addAttributes(attributes: { [key: string]: string }): void {
        Object.keys(attributes).forEach((key) => {
            this.attributes.push('attribute ' + attributes[key] + ' ' + key + ';');
        });
    }

    addUniforms(uniforms: { [key: string]: string }): void {
        Object.keys(uniforms).forEach((key) => {
            this.uniforms.push('uniform ' + uniforms[key] + ' ' + key + ';');
        });
    }

    addVaryings(varyings: { [key: string]: string }): void {
        Object.keys(varyings).forEach((key) => {
            this.varyings.push('varying ' + varyings[key] + ' ' + key + ';');
        });
    }

    addLines(lines: string[]): void {
        this.statements.push(...lines);
    }

    addFunction(func: string[]): void {
        this.functions.push(func.join('\n'));
    }

    addWaveform(name: string, waveform: any): void {
        if (!waveform) {
            this.statements.push('float ' + name + ' = 0.0;');
            return;
        }
        if (typeof (waveform.phase) == "number") {
            waveform.phase = waveform.phase.toFixed(4)
        }

        let funcName = '';
        switch (waveform.funcName) {
            case 'sin':
                this.statements.push('float ' + name + ' = ' + waveform.base.toFixed(4) + ' + sin((' + waveform.phase + ' + time * ' + waveform.freq.toFixed(4) + ') * 6.283) * ' + waveform.amplitude.toFixed(4) + ';');
                return;
            case 'square': funcName = 'square'; this.addSquareFunc(); break;
            case 'triangle': funcName = 'triangle'; this.addTriangleFunc(); break;
            case 'sawtooth': funcName = 'fract'; break;
            case 'inversesawtooth': funcName = '1.0 - fract'; break;
            default:
                this.statements.push('float ' + name + ' = 0.0;');
                return;
        }
        this.statements.push('float ' + name + ' = ' + waveform.base.toFixed(4) + ' + ' + funcName + '(' + waveform.phase + ' + time * ' + waveform.freq.toFixed(4) + ') * ' + waveform.amplitude.toFixed(4) + ';');
    }

    addSquareFunc() {
        this.addFunction([
            'float square(float val) {',
            '   return (mod(floor(val*2.0)+1.0, 2.0) * 2.0) - 1.0;',
            '}',
        ]);
    }


    addTriangleFunc() {
        this.addFunction([
            'float triangle(float val) {',
            '   return abs(2.0 * fract(val) - 1.0);',
            '}',
        ]);
    }

    build(): string {
        let source = '\
#ifdef GL_ES \n\
precision highp float; \n\
#endif \n';
        source += this.attributes.join('\n') + '\n';
        source += this.varyings.join('\n') + '\n';
        source += this.uniforms.join('\n') + '\n';
        source += this.functions.join('\n') + '\n';

        source += 'void main(void) {\n\t';
        source += this.statements.join('\n\t');
        source += '\n}\n';

        return source;
    }
};
