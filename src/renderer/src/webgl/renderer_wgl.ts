
import { mat4, vec3 } from 'gl-matrix';
import PlayerMover from './playerMover';
import Q3Map from './Q3Map';
import { BSPShader } from '../../../../idlib/BspReader.types';
import {GLShader} from './glShaderBuilder'
import GlShaderManager from './glShaderManager';

let glContext: WebGL2RenderingContext | null = null;
const projectionMatrix = mat4.create();

const playerMover = new PlayerMover();

function onResize() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const canvas = document.getElementById("viewport") as HTMLCanvasElement | null;
    if (!canvas) {
        return;
    }
    if (document.fullscreenElement) {
        canvas.width = screen.width * devicePixelRatio;
        canvas.height = screen.height * devicePixelRatio;
    } else {
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;
    }

    glContext?.viewport(0, 0, canvas.width, canvas.height);
    mat4.perspective(projectionMatrix, 45.0, canvas.width / canvas.height, 1.0, 4096.0);
}

const pressed = new Set<string>();
const cameraMat = mat4.create();
let zAngle = 3;
let xAngle = 0;

function moveLookLocked(xDelta: number, yDelta: number) {
    zAngle += xDelta * 0.0025;
    while (zAngle < 0) {
        zAngle += Math.PI * 2;
    }
    while (zAngle >= Math.PI * 2) {
        zAngle -= Math.PI * 2;
    }

    xAngle += yDelta * 0.0025;
    while (xAngle < -Math.PI * 0.5) {
        xAngle = -Math.PI * 0.5;
    }
    while (xAngle > Math.PI * 0.5) {
        xAngle = Math.PI * 0.5;
    }
}

function moveViewOriented(dir: number[], frameTime: number) {
  if(dir[0] !== 0 || dir[1] !== 0 || dir[2] !== 0) {
    mat4.identity(cameraMat);
    mat4.rotateZ(cameraMat, cameraMat, zAngle);
    mat4.invert(cameraMat, cameraMat);
    vec3.transformMat4(dir, dir, cameraMat);
  }

  // Send desired movement direction to the player mover for collision detection against the map
  playerMover.move(dir, frameTime);
}

function initEvents() {
    let movingModel = false;
    let lastX = 0;
    let lastY = 0;
    let lastMoveX = 0;
    let lastMoveY = 0;
    const viewport = document.getElementById("viewport");
    const viewportFrame = document.getElementById("viewport-frame");

    document.addEventListener("keydown", function (event) {
        if (event.key === ' ' && !pressed.has(' ')) {
            playerMover.jump();
        }
        pressed.add(event.key);
        if ((event.key === 'w' ||
            event.key === 's' ||
            event.key === 'a' ||
            event.key === 'd' ||
            event.key === ' ') && !event.ctrlKey) {
            event.preventDefault();
        }
    }, false);

    document.addEventListener("keyup", function (event) {
        pressed.delete(event.key);
    }, false);

    function startLook(x: number, y: number) {
        movingModel = true;

        lastX = x;
        lastY = y;
    }

    function endLook() {
        movingModel = false;
    }

    function moveLook(x: number, y: number) {
        const xDelta = x - lastX;
        const yDelta = y - lastY;
        lastX = x;
        lastY = y;

        if (movingModel) {
            moveLookLocked(xDelta, yDelta);
        }
    }

    function startMove(x: number, y: number) {
        lastMoveX = x;
        lastMoveY = y;
    }

    function moveUpdate(x: number, y: number, frameTime: number) {
        const xDelta = x - lastMoveX;
        const yDelta = y - lastMoveY;
        lastMoveX = x;
        lastMoveY = y;

        const dir = [xDelta, yDelta * -1, 0];

        moveViewOriented(dir, frameTime * 2);
    }

    viewport?.addEventListener("click", function () {
        viewport.requestPointerLock();
    }, false);

    // Mouse handling code
    // When the mouse is pressed it rotates the players view
    viewport?.addEventListener("mousedown", function (event) {
        if (event.button === 0) {
            startLook(event.pageX, event.pageY);
        }
    }, false);

    viewport?.addEventListener("mouseup", function () {
        endLook();
    }, false);

    viewportFrame?.addEventListener("mousemove", function (event) {
        if (document.pointerLockElement) {
            moveLookLocked(event.movementX, event.movementY);
        } else {
            moveLook(event.pageX, event.pageY);
        }
    }, false);

    // Touch handling code
    viewport?.addEventListener('touchstart', function (event) {
        const touches = event.touches;
        switch (touches.length) {
            case 1: // Single finger looks around
                startLook(touches[0].pageX, touches[0].pageY);
                break;
            case 2: // Two fingers moves
                startMove(touches[0].pageX, touches[0].pageY);
                break;
            case 3: // Three finger tap jumps
                playerMover.jump();
                break;
            default:
                return;
        }
        event.stopPropagation();
        event.preventDefault();
    }, false);

    viewport?.addEventListener('touchend', function () {
        endLook();
        return false;
    }, false);

    viewport?.addEventListener('touchmove', function (event) {
        const touches = event.touches;
        switch (touches.length) {
            case 1:
                moveLook(touches[0].pageX, touches[0].pageY);
                break;
            case 2:
                moveUpdate(touches[0].pageX, touches[0].pageY, 16);
                break;
            default:
                return;
        }
        event.stopPropagation();
        event.preventDefault();
    }, false);

}
const effectSurfaces:{bspShader: BSPShader, glShader: GLShader}[] = [];

function bindShaders(gl: WebGL2RenderingContext, map: Q3Map)
{
    if (!map.bspObject.shaders){
        return;
    }
    effectSurfaces.length = 0;
    // Loop though each of the bsp shaders and look-up the real
    // shader based on the name.
    for(const bspShader of map.bspObject.shaders){
        if (bspShader.surfaces.length > 0){
            const glShader = map.glShaders.get(bspShader.shader);
            if (!glShader){
                // TODO: use default shader
            } else {
                effectSurfaces.push({bspShader, glShader});
            }
        }
    }
    // Sort to ensure correct order of transparent objects
    effectSurfaces.sort(function(a, b) {
        const order = a.glShader.sort - b.glShader.sort;
        return order;
    });

}

// ref https://github.com/toji/webgl-quake3

const glShaderManager = new GlShaderManager();

async function initMap(gl: WebGL2RenderingContext, mapName: string): Promise<Q3Map> {
    glShaderManager.init(gl);
    const titleEl = document.getElementById("mapTitle");
    if (titleEl) {
        titleEl.innerHTML = mapName + ".bsp";
    }
    const bspObject = await bsp.load(mapName);
    const map = new Q3Map(gl, bspObject);
    await map.loadShaders();
    map.compileGeometry();
    bindShaders(gl, map);
    return map;
}

function initGL(gl: WebGL2RenderingContext) {

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
}

const playerHeight = 57;

function getViewMatrix(viewMatrix: mat4) {
  mat4.identity(viewMatrix);

  mat4.translate(viewMatrix, viewMatrix, playerMover.position);
  mat4.translate(viewMatrix, viewMatrix, [0, 0, playerHeight]);
  mat4.rotateZ(viewMatrix, viewMatrix, -zAngle);
  mat4.rotateX(viewMatrix, viewMatrix, Math.PI/2);
  mat4.rotateX(viewMatrix, viewMatrix, -xAngle);
  mat4.invert(viewMatrix, viewMatrix);
}

function onFrame(gl: WebGL2RenderingContext, map: Q3Map, event:{now:number, elapsed: number, frameTime: number})
{
    gl.depthMask(true);
    const viewMatrix = mat4.create();
    getViewMatrix(viewMatrix);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Here's where all the magic happens...
    //map.draw(viewMatrix, projectionMatrix);
    if (map.indexCount === 0 || !map.indexBuffer || !map.vertexBuffer){
        return;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, map.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, map.vertexBuffer);

    for(const {bspShader, glShader} of effectSurfaces) {

        if(bspShader.surfaces.length == 0 /*|| surface.visible !== true*/) { continue; }
        
        glShaderManager.setShader(gl, glShader);
        
        for(const stage of glShader.stages) {
            const shaderProgram = glShaderManager.setShaderStage(gl, glShader, stage, event.elapsed / 1000);
            if(!shaderProgram) { continue; }
            bindShaderAttribs(shaderProgram);
            bindShaderMatrix(shaderProgram, viewMatrix, projectionMatrix);
            // Draw all geometry that uses this textures
            gl.drawElements(gl.TRIANGLES, bspShader.indexCount / 3, gl.UNSIGNED_SHORT, bspShader.indexOffset);
        }
    }
}

function renderLoop(gl: WebGL2RenderingContext, map: Q3Map) {
    let startTime:number = 0;
    let lastFrameTime:number = 0;

    function onRequestedFrame(){
        const now = new Date().getTime();

        if (startTime === 0) {
            startTime = now;
        }
        const elapsed = now - startTime;
        const frameTime = now - lastFrameTime;
        lastFrameTime = now;
        
        onFrame(gl, map, {
            now,
            elapsed,
            frameTime
        });
        window.requestAnimationFrame(onRequestedFrame);
    }
    window.requestAnimationFrame(onRequestedFrame);
}

async function main() {
    const canvas = document.getElementById("viewport") as HTMLCanvasElement | null;
    if (!canvas) {
        console.error("No canvas found");
        return;
    }
    glContext = canvas.getContext('webgl2', { antialias: false });

    if (!glContext) {
        console.error("Unable to initialize WebGL2. Your browser or machine may not support it.");
        return;
    }

    initEvents();
    initGL(glContext);

    const config = await game.config();
    const map = await initMap(glContext, config.bspName);
    renderLoop(glContext, map);

    onResize();
    window.addEventListener("resize", onResize, false);

}

window.addEventListener("load", () => main()); 
