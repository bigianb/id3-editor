
import { BSP } from '../../../../idlib/BspReader.types';
import { Shader } from '../../../../idlib/Shaders.types';
import GlShaderBuilder from './glShaderBuilder';

export default class Q3Map
{
    glShaders: Map<string, WebGLProgram> = new Map();
    glShaderBuilder: GlShaderBuilder;
    bspObject: BSP;

    constructor(gl: WebGL2RenderingContext, bspObject: BSP) {
        this.glShaderBuilder = new GlShaderBuilder(gl);
        this.bspObject = bspObject;
    }

    async loadShaders() {
        const shaders: Map<string, Shader> = await basefs.loadShaders();
        if (!shaders) {
            console.error('Failed to load shader list');
            return;
        }
        this.buildShaders(shaders);
    }

    buildShaders(shaders: Map<string, Shader>) {
        shaders.forEach((shader, name) => {
            const glShader = this.glShaderBuilder.build(name, shader);
            this.glShaders.set(name, glShader);
        });
    }

}
