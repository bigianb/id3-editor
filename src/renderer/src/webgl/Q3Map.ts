
import { BSP } from '../../../../idlib/BspReader.types';
import { Shader } from '../../../../idlib/Shaders.types';
import { tesselate } from '../../../../idlib/Tesselation';
import GlShaderBuilder, { GLShader } from './glShaderBuilder';

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

    constructor(gl: WebGL2RenderingContext, bspObject: BSP)
    {
        this.gl = gl;
        this.glShaderBuilder = new GlShaderBuilder(gl);
        this.bspObject = bspObject;
    }

    async loadShaders()
    {
        const shaders: Map<string, Shader> = await basefs.loadShaders();
        if (!shaders) {
            console.error('Failed to load shader list');
            return;
        }
        this.buildShaders(shaders);
    }

    buildShaders(shaders: Map<string, Shader>)
    {
        shaders.forEach((shader, name) =>
        {
            const glShader = this.glShaderBuilder.build(name, shader);
            this.glShaders.set(name, glShader);
        });
    }

    compileGeometry()
    {
        console.log('Compiling Q3 map geometry');
        if (!this.bspObject.surfaces || !this.bspObject.drawVerts || !this.bspObject.drawIndices || !this.bspObject.shaders) {
            return;
        }

        for (const surface of this.bspObject.surfaces) {
            if ([SurfaceType.MST_PATCH, SurfaceType.MST_PLANAR, SurfaceType.MST_TRIANGLE_SOUP].includes(surface.surfaceType)) {
                // Add this surface to the relevant shader
                const shader = this.bspObject.shaders[surface.shaderNum];
                shader.surfaces.push(surface);
                // TODO: lightmap adjust.
                shader.surfaceType = surface.surfaceType;
                if (surface.surfaceType === SurfaceType.MST_PATCH) {
                    // convert beziers to mesh. Tesselation level set to 5.
                    const tesselationLevel = 0;
                    tesselate(surface, this.bspObject.drawVerts, this.bspObject.drawIndices, tesselationLevel);
                }
            } else {
                console.warn('Skipped surface of type ' + surface.surfaceType);
            }
        }

        const vertices: number[] = new Array(this.bspObject.drawVerts.length * 14);

        let offset = 0;
        for (const vert of this.bspObject.drawVerts) {

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

            vertices[offset++] = vert.colour[0] / 255.0;
            vertices[offset++] = vert.colour[1] / 255.0;
            vertices[offset++] = vert.colour[2] / 255.0;
            vertices[offset++] = vert.colour[3] / 255.0;
        }

        let numProcessedSurfaces = 0;
        // Organise the indices so that they are grouped by shader.
        const indices: number[] = [];
        for (const shader of this.bspObject.shaders) {
            if (shader.surfaces.length > 0) {
                numProcessedSurfaces += shader.surfaces.length;
                if (shader.indexCount > 0) {
                    console.warn('Shader ' + shader + ' has already been assigned indices.');
                }
                shader.indexCount = 0;
                shader.indexOffset = indices.length * 2; // Offset is in bytes
                for (const surface of shader.surfaces) {
                    for (let k = 0; k < surface.numIndices; ++k) {
                        const idx = surface.firstVert + this.bspObject.drawIndices[surface.firstIndex + k];
                        if (idx > 65535){
                            console.error('Index exceeds 65535 limit for 16-bit index buffer: ' + idx);
                        }
                        indices.push(idx);
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
        console.log(`Compiled ${this.indexCount} indices from ${this.bspObject.drawIndices.length} draw indices.`);
        console.log(`Processed ${numProcessedSurfaces} surfaces from ${this.bspObject.surfaces.length} total surfaces.`);
    }
}
