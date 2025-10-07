
import { BSP } from '../../../../idlib/BspReader.types';
import { Shader } from '../../../../idlib/Shaders.types';
import GlShaderBuilder, {GLShader} from './glShaderBuilder';

const SurfaceType = {
    MST_BAD: 0,
    MST_PLANAR: 1,
    MST_PATCH: 2,
    MST_TRIANGLE_SOUP: 3,
    MST_FLARE: 4
};

export default class Q3Map
{
    glShaders: Map<string, GLShader> = new Map();
    glShaderBuilder: GlShaderBuilder;
    bspObject: BSP;
    gl: WebGL2RenderingContext;

    vertexBuffer?: WebGLBuffer;
    indexBuffer?: WebGLBuffer;
    indexCount: number = 0;

    constructor(gl: WebGL2RenderingContext, bspObject: BSP) {
        this.gl = gl;
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
        if (!this.bspObject.surfaces || !this.bspObject.drawVerts || !this.bspObject.drawIndices || !this.bspObject.shaders){
            return;
        }

        for (const surface of this.bspObject.surfaces) {
            if (surface.surfaceType in [SurfaceType.MST_PATCH,SurfaceType.MST_PLANAR,SurfaceType.MST_TRIANGLE_SOUP]) {
                // Add this surface to the relevant shader
                const shader = this.bspObject.shaders[surface.shaderNum];
                shader.surfaces.push(surface);
                // TODO: lightmap adjust.
                if (surface.surfaceType === SurfaceType.MST_PATCH) {
                    // convert beziers to mesh
                    //geometry = this.getPatchGeometry(surface);
                }
            }
        }

        const vertices:number[] = new Array(this.bspObject.drawVerts.length*14);
        
        let offset = 0;
        for(const vert of this.bspObject.drawVerts) {

            vertices[offset++] = vert.xyz.x;
            vertices[offset++] = vert.xyz.y;
            vertices[offset++] = vert.xyz.z;
            
            vertices[offset++] = vert.st[0];
            vertices[offset++] = vert.st[1];
            
            // TODO: Lightmaps
            vertices[offset++] = 0; //vert.lmNewCoord[0];
            vertices[offset++] = 0; //vert.lmNewCoord[1];
            
            vertices[offset++] = vert.normal.x;
            vertices[offset++] = vert.normal.y;
            vertices[offset++] = vert.normal.z;
            
            vertices[offset++] = vert.colour[0];
            vertices[offset++] = vert.colour[1];
            vertices[offset++] = vert.colour[2];
            vertices[offset++] = vert.colour[3];
        }

        // Organise the indices so that they are grouped by shader.
        const indices:number[] = [];
        for(const shader of this.bspObject.shaders) {
            if(shader.surfaces.length > 0) {
                shader.indexOffset = indices.length * 2; // Offset is in bytes
                for(const surface of this.bspObject.surfaces) {
                    for(let k = 0; k < surface.numIndices; ++k) {
                        indices.push(surface.firstIndex + this.bspObject.drawIndices[k]);
                    }
                    shader.indexCount += surface.numIndices;
                }
            }
        }

        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        
        this.indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        
        this.indexCount = indices.length;
    }
}
