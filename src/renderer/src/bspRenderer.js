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
                texture.flipY = true;
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

        for (let surface of this.bspObject.surfaces) {
            if (surface.surfaceType !== SurfaceType.MST_PLANAR) {
                console.warn(`Unsupported surface type: ${surface.surfaceType}`);
                continue;
            }
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            const colours = [];
            const st = [];
            for (let idx = 0; idx < surface.numIndices; idx++) {
                // TODO: this duplicates vertices
                const vertexIndex = this.bspObject.drawIndices[surface.firstIndex + idx];
                const vertex = this.bspObject.drawVerts[surface.firstVert + vertexIndex];
                indices.push(idx);
                vertices.push(vertex.xyz.x, vertex.xyz.y, vertex.xyz.z);
                colours.push(vertex.colour[0] / 255, vertex.colour[1] / 255, vertex.colour[2] / 255);
                let u = vertex.st[0];
                let v = vertex.st[1];/*
                if (u > 1){
                    u -= Math.floor(u);
                }
                if (v < -1){
                    v = v - Math.floor(v);
                }
                v = 1 - v;*/
                st.push(u, v);
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
                    //vertexColors: true,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                scene.add(mesh);
            }
        }

        return scene;
    }

}
