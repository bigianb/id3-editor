import { vec3 } from 'gl-matrix';
import { BSPSurface, BSPVertex } from './BspReader.types';


function getCurvePoint3(c0:vec3, c1:vec3, c2:vec3, dist: number): vec3
{
    const b = 1.0 - dist;
    let a:vec3;
    return vec3.add(
        a = vec3.add(
            a = vec3.scale([0, 0, 0], c0, (b * b)),
            a,
            vec3.scale([0, 0, 0], c1, (2 * b * dist))
        ),
        a,
        vec3.scale([0, 0, 0], c2, (dist * dist))
    );
};

function getCurvePoint2(c0:[number, number], c1:[number, number], c2:[number, number], dist: number): [number, number]
{
    const b = 1.0 - dist;
    let a:vec3;

    const c30 = [c0[0], c0[1], 0];
    const c31 = [c1[0], c1[1], 0];
    const c32 = [c2[0], c2[1], 0];

    const res = vec3.add(
        a = vec3.add(
            a = vec3.scale([0, 0, 0], c30, (b * b)),
            a,
            vec3.scale([0, 0, 0], c31, (2 * b * dist))
        ),
        a,
        vec3.scale([0, 0, 0], c32, (dist * dist))
    );

    return [res[0], res[1]];
};

function xyzToVec3(xyz:{x:number, y:number, z:number}):vec3
{
    return [xyz.x, xyz.y, xyz.z];
}

export
function tesselate(face: BSPSurface, verts: BSPVertex[], indices: number[], level: number)
{
    const off = face.firstVert;
    const L1 = level + 1;

    face.firstVert = verts.length;
    face.firstIndex = indices.length;

    face.numVerts = 0;
    face.numIndices = 0;

    /*
    let i=off;
    const outtxt:BSPVertex[] = [];
    for (let y=0; y < face.patchHeight; ++y){
        for (let x=0; x < face.patchWidth; ++x){
            const v = verts[i++];
            outtxt.push(v);
        }
    }
    console.log(JSON.stringify(outtxt));
*/

    for (let py = 0; py < face.patchHeight - 2; py += 2) {
        for (let px = 0; px < face.patchWidth - 2; px += 2) {

            let rowOff = (py * face.patchWidth);

            // Store control points
            const c0 = verts[off + rowOff + px], c1 = verts[off + rowOff + px + 1], c2 = verts[off + rowOff + px + 2];
            rowOff += face.patchWidth;
            const c3 = verts[off + rowOff + px], c4 = verts[off + rowOff + px + 1], c5 = verts[off + rowOff + px + 2];
            rowOff += face.patchWidth;
            const c6 = verts[off + rowOff + px], c7 = verts[off + rowOff + px + 1], c8 = verts[off + rowOff + px + 2];

            const indexOff = face.numVerts;
            face.numVerts += L1 * L1;

            // Tesselate!
            for (let i = 0; i < L1; ++i) {
                const a = i / level;

                const pos = getCurvePoint3(xyzToVec3(c0.xyz), xyzToVec3(c3.xyz), xyzToVec3(c6.xyz), a);
                const lmCoord = getCurvePoint2(c0.lightmap, c3.lightmap, c6.lightmap, a);
                const texCoord = getCurvePoint2(c0.st, c3.st, c6.st, a);
                const color = getCurvePoint3(c0.colour, c3.colour, c6.colour, a);

                const vert:BSPVertex = {
                    xyz: {x:pos[0], y:pos[1], z:pos[2]},
                    st: texCoord,
                    lightmap: lmCoord,
                    colour: [color[0], color[1], color[2], 1],
                    normal: {x:0, y:0, z:1}
                };

                verts.push(vert);
            }

            for (let i = 1; i < L1; i++) {
                const a = i / level;

                const pc0 = getCurvePoint3(xyzToVec3(c0.xyz), xyzToVec3(c1.xyz), xyzToVec3(c2.xyz), a);
                const pc1 = getCurvePoint3(xyzToVec3(c3.xyz), xyzToVec3(c4.xyz), xyzToVec3(c5.xyz), a);
                const pc2 = getCurvePoint3(xyzToVec3(c6.xyz), xyzToVec3(c7.xyz), xyzToVec3(c8.xyz), a);

                const tc0 = getCurvePoint2(c0.st, c1.st, c2.st, a);
                const tc1 = getCurvePoint2(c3.st, c4.st, c5.st, a);
                const tc2 = getCurvePoint2(c6.st, c7.st, c8.st, a);

                const lc0 = getCurvePoint2(c0.lightmap, c1.lightmap, c2.lightmap, a);
                const lc1 = getCurvePoint2(c3.lightmap, c4.lightmap, c5.lightmap, a);
                const lc2 = getCurvePoint2(c6.lightmap, c7.lightmap, c8.lightmap, a);

                const cc0 = getCurvePoint3(c0.colour, c1.colour, c2.colour, a);
                const cc1 = getCurvePoint3(c3.colour, c4.colour, c5.colour, a);
                const cc2 = getCurvePoint3(c6.colour, c7.colour, c8.colour, a);

                for (let j = 0; j < L1; j++) {
                    const b = j / level;

                    const pos = getCurvePoint3(pc0, pc1, pc2, b);
                    const texCoord = getCurvePoint2(tc0, tc1, tc2, b);
                    const lmCoord = getCurvePoint2(lc0, lc1, lc2, b);
                    const color = getCurvePoint3(cc0, cc1, cc2, a);

                    const vert:BSPVertex = {
                        xyz: {x:pos[0], y:pos[1], z:pos[2]},
                        st: texCoord,
                        lightmap: lmCoord,
                        colour: [color[0], color[1], color[2], 1],
                        normal: {x:0, y:0, z:1}
                    };

                    verts.push(vert);
                }
            }

            face.numIndices += level * level * 6;

            for (let row = 0; row < level; ++row) {
                for (let col = 0; col < level; ++col) {
                    indices.push(indexOff + (row + 1) * L1 + col);
                    indices.push(indexOff + row * L1 + col);
                    indices.push(indexOff + row * L1 + (col + 1));

                    indices.push(indexOff + (row + 1) * L1 + col);
                    indices.push(indexOff + row * L1 + (col + 1));
                    indices.push(indexOff + (row + 1) * L1 + (col + 1));
                }
            }

        }
    }
};
