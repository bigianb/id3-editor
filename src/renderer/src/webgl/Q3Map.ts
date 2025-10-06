
import { BSP } from '../../../../idlib/BspReader.types';
import { Shader } from '../../../../idlib/Shaders.types';
import GlShaderBuilder from './glShaderBuilder';

const SurfaceType = {
    MST_BAD: 0,
    MST_PLANAR: 1,
    MST_PATCH: 2,
    MST_TRIANGLE_SOUP: 3,
    MST_FLARE: 4
};

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

    compileGeometry(){
        if (!this.bspObject.surfaces){
            return;
        }
        for (const surface of this.bspObject.surfaces) {
            let geometry = null;
            if (surface.surfaceType === SurfaceType.MST_PLANAR || surface.surfaceType === SurfaceType.MST_TRIANGLE_SOUP) {
                geometry = this.getPlanarGeometry(surface);
            } else if (surface.surfaceType === SurfaceType.MST_PATCH) {
                geometry = this.getPatchGeometry(surface);
            }

            if (!geometry) {
                console.warn(`Unsupported surface type: ${surface.surfaceType}`);
                continue;
            }
        }
    }
}
