import * as THREE from 'three';

const SurfaceType = {
    MST_BAD: 0,
    MST_PLANAR: 1,
    MST_PATCH: 2,
    MST_TRIANGLE_SOUP: 3,
    MST_FLARE: 4
};

const entityMaterials = {
    'light': new THREE.MeshBasicMaterial({ color: 0xf0f0f0 }),
    'info_player_start': new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    'info_pathnode': new THREE.MeshBasicMaterial({ color: 0x008080 }),
    'script_model': new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    'script_object': new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    'func_camera': new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    'default': new THREE.MeshBasicMaterial({ color: 0x808080 })
};

function findParam(shaderScript, paramName) {
    for (const line of shaderScript.params) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] === paramName) {
            return parts[1];
        }
    }
    return null;
}

export default
    class BspRenderer {
    constructor(bspObject) {
        this.bspObject = bspObject;
        this.textures = [];
    }

    async loadShaders() {

        const shaders = await basefs.loadShaders();
        if (!shaders) {
            console.error('Failed to load shader list');
            return;
        }
        console.log(shaders);
        this.bspObject.shaderScripts = shaders;
    }

    async findImage(imageName){
        let exits = await basefs.exists(imageName);
        if (exits) {
            return imageName;
        }
        let ext = imageName.slice(-4).toLowerCase();
        let basename = imageName;
        if (ext[[0]] === '.') {
            basename = imageName.slice(0, -4)
        }
        let candidates = [basename + '.jpg', basename + '.ftx', basename + '.png', basename + '.tga'];
        for (const candidate of candidates) {
            exits = await basefs.exists(candidate);
            if (exits) {
                return candidate;
            }
        }
        return null;
    }

    async loadTextures() {
        /* Shader looks like:
        {
            "shader": "textures/common/caulk",
            "surfaceFlags": 1184,
            "contentFlags": 1,
            "subdivisions": 0
        }   
        */
        await this.loadShaders();
        this.textures = [];
        for (const shader of this.bspObject.shaders) {
            // look for qer_editorimage
            try {
                // Look for shader script
                let shaderScript = null;
                if (this.bspObject.shaderScripts) {
                    shaderScript = this.bspObject.shaderScripts.get(shader.shader);
                }
                let imageName = shader.shader; // fallback to shader name
                if (shaderScript) {
                    const qer_editorimage = findParam(shaderScript, 'qer_editorimage');
                    if (qer_editorimage) {
                        imageName = qer_editorimage;
                    }
                }
                imageName = await this.findImage(imageName);
                if (!imageName) {
                    throw 'No image';
                }

                // Use this texture
                const fileData = await basefs.load(imageName);
                if (imageName.endsWith('.jpg')) {
                    // JPEG
                    const blob = new Blob([fileData], { type: 'image/jpeg' });
                    const imageBitmap = await createImageBitmap(blob);
                    const texture = new THREE.CanvasTexture(imageBitmap);
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.needsUpdate = true;
                    texture.flipY = false;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    this.textures.push(texture);
                    continue;
                } else if (imageName.endsWith('.ftx')) {

                    // fileData is a Uint8Array
                    const dv = new DataView(fileData.buffer, fileData.byteOffset, fileData.byteLength);
                    const width = dv.getUint32(0, true);
                    const height = dv.getUint32(4, true);
                    //const hasAlpha = dv.getUint32(8, true);

                    const imageData = fileData.slice(12);
                    const texture = new THREE.DataTexture(imageData, width, height);
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.needsUpdate = true;
                    texture.flipY = false;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    this.textures.push(texture);
                } else {
                    throw `Unsupported image format: ${imageName}`;
                }
            } catch (e) {
                console.log(e);
                console.log(`Failed to load ${shader.shader}`);
                this.textures.push(null);
            }
        }
    }

    getPlanarGeometry(surface) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const colours = [];
        const st = [];
        if (surface.numIndices % 3 !== 0) {
            console.warn(`Number of indices not a multiple of 3: ${surface.numIndices}`);
        }
        for (let idx = 0; idx < surface.numIndices; idx++) {
            // TODO: this duplicates vertices
            const vertexIndex = this.bspObject.drawIndices[surface.firstIndex + idx];
            const vertex = this.bspObject.drawVerts[surface.firstVert + vertexIndex];
            indices.push(idx);

            /*
                Q3:
                    X-axis: positive X is to the right.
                    Y-axis: positive Y is into the screen.
                    Z-axis: positive Z is up.
    
                Three.js:
                    X-axis: positive X is to the right.
                    Y-axis: positive Y is up.
                    Z-axis: positive Z is out of the screen.
    
            */
            vertices.push(vertex.xyz.x, vertex.xyz.z, -vertex.xyz.y);
            colours.push(vertex.colour[0] / 255, vertex.colour[1] / 255, vertex.colour[2] / 255);
            st.push(vertex.st[0], vertex.st[1]);
        }
        geometry.setIndex(indices);

        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colours), 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(st), 2));
        return geometry;
    }

    getPatchGeometry(surface) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const colours = [];
        const st = [];

        const numPoints = surface.patchWidth * surface.patchHeight;
        for (let idx = 0; idx < numPoints; idx++) {
            const vertex = this.bspObject.drawVerts[surface.firstVert + idx];

            /*
                Q3:
                    X-axis: positive X is to the right.
                    Y-axis: positive Y is into the screen.
                    Z-axis: positive Z is up.
    
                Three.js:
                    X-axis: positive X is to the right.
                    Y-axis: positive Y is up.
                    Z-axis: positive Z is out of the screen.
    
            */
            vertices.push(vertex.xyz.x, vertex.xyz.z, -vertex.xyz.y);
            colours.push(vertex.colour[0] / 255, vertex.colour[1] / 255, vertex.colour[2] / 255);
            st.push(vertex.st[0], vertex.st[1]);
        }

        // Naive triangulation. TODO: subdivide based on bezier curves.
        for (let y = 0; y < surface.patchHeight - 1; ++y) {
            const idxy0 = y * surface.patchWidth;
            for (let x = 0; x < surface.patchWidth - 1; ++x) {
                indices.push(idxy0 + x);
                indices.push(idxy0 + x + 1);
                indices.push(idxy0 + x + 1 + surface.patchWidth);

                indices.push(idxy0 + x);
                indices.push(idxy0 + x + 1 + surface.patchWidth);
                indices.push(idxy0 + x + surface.patchWidth);
            }
        }

        geometry.setIndex(indices);

        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colours), 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(st), 2));
        return geometry;
    }

    async convertToScene(renderWireframe = false) {
        await this.loadTextures();

        const textureToMaterialMap = new Map();
        const scene = new THREE.Scene();

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

            const texture = this.textures[surface.shaderNum];
            //console.log(texture)
            if (renderWireframe) {
                const wireframe = new THREE.WireframeGeometry(geometry);
                const line = new THREE.LineSegments(wireframe);
                line.material.depthTest = false;
                line.material.opacity = 0.25;
                line.material.transparent = true;
                scene.add(line);
            } else {
                let material = textureToMaterialMap.get(texture);
                if (!material) {
                    material = new THREE.MeshBasicMaterial({
                        map: texture,
                        vertexColors: true,
                        side: THREE.DoubleSide
                    });
                    textureToMaterialMap.set(texture, material);
                }
                const mesh = new THREE.Mesh(geometry, material);

                mesh.userData['shader'] = this.bspObject.shaders[surface.shaderNum];
                mesh.userData['surface'] = surface;

                scene.add(mesh);
            }
        }

        for (const entity of this.bspObject.entities) {
            const posVal = entity.origin;
            if (posVal) {
                if (entity.classname === 'light') {
                    const geometry = new THREE.SphereGeometry(10.0);
                    const material = entityMaterials.light;
                    const cube = new THREE.Mesh(geometry, material);

                    cube.position.x = posVal[0];
                    cube.position.y = posVal[2];
                    cube.position.z = -posVal[1];

                    cube.userData['entity'] = entity;
                    scene.add(cube);
                } else {
                    const geometry = new THREE.BoxGeometry(10.0, 10.0, 10.0);
                    const material = entityMaterials[entity.classname] ?? entityMaterials['default'];
                    const cube = new THREE.Mesh(geometry, material);

                    cube.position.x = posVal[0];
                    cube.position.y = posVal[2];
                    cube.position.z = -posVal[1];

                    cube.userData['entity'] = entity;

                    scene.add(cube);
                }
            }
        }

        return scene;
    }

}
