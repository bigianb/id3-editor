import { BSPLightmap, BSPShader } from "../../../../idlib/BspReader.types";
import { GLShader, GLShaderStage } from "./glShaderBuilder";
import { findImage } from './imageLoader';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';

const q3bsp_default_vertex = '\
    #ifdef GL_ES \n\
    precision highp float; \n\
    #endif \n\
    attribute vec3 position; \n\
    attribute vec3 normal; \n\
    attribute vec2 texCoord; \n\
    attribute vec2 lightCoord; \n\
    attribute vec4 color; \n\
\n\
    varying vec2 vTexCoord; \n\
    varying vec2 vLightmapCoord; \n\
    varying vec4 vColor; \n\
\n\
    uniform mat4 modelViewMat; \n\
    uniform mat4 projectionMat; \n\
\n\
    void main(void) { \n\
        vec4 worldPosition = modelViewMat * vec4(position, 1.0); \n\
        vTexCoord = texCoord; \n\
        vColor = color; \n\
        vLightmapCoord = lightCoord; \n\
        gl_Position = projectionMat * worldPosition; \n\
    } \n\
';


const q3bsp_default_fragment = '\
    #ifdef GL_ES \n\
    precision highp float; \n\
    #endif \n\
    varying vec2 vTexCoord; \n\
    varying vec2 vLightmapCoord; \n\
    uniform sampler2D texture; \n\
    uniform sampler2D lightmap; \n\
\n\
    void main(void) { \n\
        vec4 diffuseColor = texture2D(texture, vTexCoord); \n\
        vec4 lightColor = texture2D(lightmap, vLightmapCoord); \n\
        gl_FragColor = vec4(diffuseColor.rgb * lightColor.rgb, diffuseColor.a); \n\
    } \n\
';

const q3bsp_model_fragment = '\
    #ifdef GL_ES \n\
    precision highp float; \n\
    #endif \n\
    varying vec2 vTexCoord; \n\
    varying vec4 vColor; \n\
    uniform sampler2D texture; \n\
\n\
    void main(void) { \n\
        vec4 diffuseColor = texture2D(texture, vTexCoord); \n\
        gl_FragColor = vec4(diffuseColor.rgb * vColor.rgb, diffuseColor.a); \n\
    } \n\
';


/**
 * Manages compiling gl shaders and binding them. Also deals with binding textures to shaders.
 */
export default class GlShaderManager
{

    white: WebGLTexture | null = null;
    lightmap: WebGLTexture | null = null;
    defaultTexture: WebGLTexture | null = null;;
    defaultProgram: WebGLProgram | null = null;
    modelProgram: WebGLProgram | null = null;
    defaultShader: GLShader | null = null;

    async init(gl: WebGL2RenderingContext, lightmaps: BSPLightmap[], lightmapSize: number)
    {
        this.buildLightmaps(gl, lightmaps, lightmapSize);
        
        this.white = this.createSolidTexture(gl, [255, 255, 255, 255]);
        this.defaultTexture = this.white;
        this.defaultProgram = this.compileShaderProgram(gl, q3bsp_default_vertex, q3bsp_default_fragment);
        this.modelProgram = this.compileShaderProgram(gl, q3bsp_default_vertex, q3bsp_model_fragment);
        this.defaultShader = await this.buildDefault(gl);
    }

    buildLightmaps(gl: WebGL2RenderingContext, lightmaps: BSPLightmap[], lightmapSize: number)
    {
        this.lightmap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.lightmap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lightmapSize, lightmapSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

        for (let i = 0; i < lightmaps.length; ++i) {
            gl.texSubImage2D(
                gl.TEXTURE_2D, 0, lightmaps[i].x, lightmaps[i].y, lightmaps[i].width, lightmaps[i].height,
                gl.RGBA, gl.UNSIGNED_BYTE, lightmaps[i].bytes
            );
        }

        gl.generateMipmap(gl.TEXTURE_2D);
    }


    async buildDefault(gl: WebGL2RenderingContext, surface?: BSPShader): Promise<GLShader>
    {
        const diffuseStage: GLShaderStage = {
            map: (surface ? surface.shader + '.png' : null),
            isLightmap: false,
            blendSrcGL: gl.ONE,
            blendDestGL: gl.ZERO,
            depthFunc: gl.LEQUAL,
            depthWrite: true,
            texture: null
        };

        if (surface) {
            await this.loadTexture(gl, surface, diffuseStage);
        } else {
            diffuseStage.texture = this.defaultTexture;
        }

        const glShader: GLShader = {
            cull: gl.FRONT,
            blend: false,
            sort: 3,
            stages: [diffuseStage],
            sky: false,
            name: 'default',
            model: false
        };

        return glShader;
    }

    async loadShaderMaps(gl: WebGL2RenderingContext, surface: BSPShader, shader: GLShader)
    {
        for (const stage of shader.stages) {
            if (stage.map) {
                await this.loadTexture(gl, surface, stage);
            }

            if (stage.vertexShaderSource && !stage.program) {
                stage.program = this.compileShaderProgram(gl, stage.vertexShaderSource, stage.fragmentShaderSource);
            }
        }
    }

    async loadTexture(gl: WebGL2RenderingContext, surface: BSPShader, stage: GLShaderStage)
    {
        if (!stage.map) {
            console.warn('No map for stage in shader: ' + surface.shader);
            stage.texture = this.white;
            return;
        } else if (stage.map === '$lightmap') {
            // TODO stage.texture = (surface.geomType != MST_TRIANGLE_SOUP ? this.lightmap : this.white);
            stage.texture = this.lightmap;
            return;
        } else if (stage.map === '$whiteimage') {
            stage.texture = this.white;
            return;
        }

        stage.texture = this.defaultTexture;

        if (stage.map == 'anim') {
            stage.animTexture = [];
            for (let i = 0; i < stage.animMaps.length; ++i) {
                stage.animTexture[i] = await this.loadTextureFile(gl, stage, stage.animMaps[i]);
            }
            stage.animFrame = 0;
        } else {
            stage.texture = await this.loadTextureFile(gl, stage, stage.map);
        }
    }

    async loadTextureFile(gl: WebGL2RenderingContext, stage: GLShaderStage, name: string): Promise<WebGLTexture | null>
    {
        const imageFSName = await findImage(name);
        if (!imageFSName) {
            console.warn('Could not find image: ' + name);
            return this.defaultTexture;
        }
        const fileData = await basefs.load(imageFSName);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (imageFSName.endsWith('.jpg')) {
            // JPEG
            const blob = new Blob([fileData], { type: 'image/jpeg' });
            const imageBitmap = await createImageBitmap(blob);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageBitmap);
        } else if (imageFSName.endsWith('.ftx')) {
            // fileData is a Uint8Array
            const dv = new DataView(fileData.buffer, fileData.byteOffset, fileData.byteLength);
            const width = dv.getUint32(0, true);
            const height = dv.getUint32(4, true);
            const imageData = fileData.slice(12);
            for (let i=3; i < imageData.length; i += 4) {
                // set alpha to opaque
                imageData[i] = 255;
            }
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
        } else if (imageFSName.endsWith('.tga')) {
            const loader = new TGALoader();
            const tgaTex = loader.parse(fileData);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tgaTex.width, tgaTex.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, tgaTex.data);
        } else {
            console.warn('Unsupported image format: ' + imageFSName);
            return this.defaultTexture;
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (stage.clamp) {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.generateMipmap(gl.TEXTURE_2D);
        return texture;
    }

    compileShaderProgram(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string): WebGLProgram | null
    {
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragmentShader) {
            console.error('Failed to create fragment shader');
            return null;
        }
        gl.shaderSource(fragmentShader, fragmentSrc);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.warn(gl.getShaderInfoLog(fragmentShader));
            console.warn(vertexSrc);
            console.warn(fragmentSrc);
            gl.deleteShader(fragmentShader);
            return null;
        }

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertexShader) {
            gl.deleteShader(fragmentShader);
            console.error('Failed to create vertex shader');
            return null;
        }
        gl.shaderSource(vertexShader, vertexSrc);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.warn(gl.getShaderInfoLog(vertexShader));
            console.warn(vertexSrc);
            console.warn(fragmentSrc);
            gl.deleteShader(vertexShader);
            return null;
        }

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            gl.deleteProgram(shaderProgram);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            console.warn('Could not link shaders');
            console.warn(vertexSrc);
            console.warn(fragmentSrc);
            return null;
        }

        const attribCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_ATTRIBUTES);
        shaderProgram.attrib = {};
        for (let i = 0; i < attribCount; i++) {
            const attrib = gl.getActiveAttrib(shaderProgram, i);
            shaderProgram.attrib[attrib.name] = gl.getAttribLocation(shaderProgram, attrib.name);
        }

        const uniformCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
        shaderProgram.uniform = {};
        for (let i = 0; i < uniformCount; i++) {
            const uniform = gl.getActiveUniform(shaderProgram, i);
            shaderProgram.uniform[uniform.name] = gl.getUniformLocation(shaderProgram, uniform.name);
        }

        //console.log(shaderProgram.attrib);
        //console.log(shaderProgram.uniform);

        return shaderProgram;
    }

    createSolidTexture(gl: WebGL2RenderingContext, colour: [number, number, number, number]): WebGLTexture
    {
        const data = new Uint8Array(colour);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        return texture;
    }

    setShader(gl: WebGL2RenderingContext, shader: GLShader)
    {
        if (!shader) {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        } else if (shader.cull && !shader.sky) {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(shader.cull);
        } else {
            gl.disable(gl.CULL_FACE);
        }
    }

    /**
     * 
     * @param gl 
     * @param shader 
     * @param shaderStage 
     * @param time in seconds
     * @returns 
     */
    setShaderStage(gl: WebGL2RenderingContext, shader: GLShader, stage: GLShaderStage, time: number): WebGLProgram
    {

        if (stage.animFreq && stage.animTexture) {
            const animFrame = Math.floor(time * stage.animFreq) % stage.animTexture.length;
            stage.texture = stage.animTexture[animFrame];
        }

        gl.blendFunc(stage.blendSrcGL, stage.blendDestGL);

        if (stage.depthWrite && !shader.sky) {
            gl.depthMask(true);
        } else {
            gl.depthMask(false);
        }

        gl.depthFunc(stage.depthFunc);

        let program = stage.program;

        if (!program) {
            if (shader.model) {
                program = this.modelProgram;
            } else {
                program = this.defaultProgram;
            }
        }

        gl.useProgram(program);

        let texture = stage.texture;
        if (!texture) { texture = this.defaultTexture; }

        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(program.uniform.texture, 0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        if (program.uniform.lightmap) {
            gl.activeTexture(gl.TEXTURE1);
            gl.uniform1i(program.uniform.lightmap, 1);
            gl.bindTexture(gl.TEXTURE_2D, this.lightmap);
        }

        if (program.uniform.time) {
            gl.uniform1f(program.uniform.time, time);
        }

        return program;
    };

}
