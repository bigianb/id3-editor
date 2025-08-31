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
    }

    convertToScene() {
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
            for (let idx = 0; idx < surface.numIndices; idx++) {
                // TODO: this duplicates vertices
                const vertexIndex = this.bspObject.drawIndices[surface.firstIndex + idx];
                const vertex = this.bspObject.drawVerts[surface.firstVert + vertexIndex];
                //console.log(vertex);
                indices.push(idx);
                vertices.push(vertex.xyz.x, vertex.xyz.y, vertex.xyz.z);
                colours.push(vertex.colour[0] / 255, vertex.colour[1] / 255, vertex.colour[2] / 255);
            }
            geometry.setIndex(indices);

            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colours), 3));

            const renderWireframe = false;
            if (renderWireframe) {

                const wireframe = new THREE.WireframeGeometry(geometry);
                const line = new THREE.LineSegments(wireframe);
                line.material.depthTest = false;
                line.material.opacity = 0.25;
                line.material.transparent = true;
                scene.add(line);
            } else {

                const material = new THREE.MeshBasicMaterial();
                material.vertexColors = true;
                material.side = THREE.DoubleSide;
                const mesh = new THREE.Mesh(geometry, material);
                scene.add(mesh);
            }
        }

        return scene;
    }

}
