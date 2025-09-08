import * as THREE from 'three';

const SurfaceType = {
    MST_BAD: 0,
    MST_PLANAR: 1,
    MST_PATCH: 2,
    MST_TRIANGLE_SOUP: 3,
    MST_FLARE: 4
};

export default
    class BspRenderer {
    constructor(bspObject) {
        this.bspObject = bspObject;
        this.textures = [];
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
        this.textures = [];
        for (const shader of this.bspObject.shaders) {
            // FIXME: assumes Alice
            try {
                const fileData = await basefs.load(shader.shader + '.ftx');

                // fileData is a Uint8Array
                const dv = new DataView(fileData.buffer);
                const width = dv.getUint32(0, true);
                const height = dv.getUint32(4, true);
                const hasAlpha = dv.getUint32(8, true);

                console.log(`${shader.shader}, width=${width}, height=${height}, hasAlpha=${hasAlpha}`);
                const imageData = fileData.slice(12);
                const texture = new THREE.DataTexture(imageData, width, height);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true;
                texture.flipY = false;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                this.textures.push(texture);
            } catch (e) {
                console.log(e)
                console.log(`Failed to load ${shader.shader}`);
                this.textures.push(null);
            }
        }
    }

    async convertToScene(renderWireframe = false) {
        await this.loadTextures();

        const scene = new THREE.Scene();

        for (const surface of this.bspObject.surfaces) {
            if (surface.surfaceType !== SurfaceType.MST_PLANAR) {
                console.warn(`Unsupported surface type: ${surface.surfaceType}`);
                continue;
            }
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
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    vertexColors: true,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                scene.add(mesh);
            }
        }

        return scene;
    }

}
