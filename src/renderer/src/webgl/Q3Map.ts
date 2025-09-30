
import { BSP } from '../../../../idlib/BspReader.types';
import { Shader } from '../../../../idlib/Shaders.types';

export default class Q3Map {
    init(gl: WebGL2RenderingContext, bspObject: BSP) {
        console.log('Q3Map init', gl, bspObject);


    }

    async loadShaders() {
        const shaders: Map<string, Shader> = await basefs.loadShaders();
        if (!shaders) {
            console.error('Failed to load shader list');
            return;
        }
    }

}
