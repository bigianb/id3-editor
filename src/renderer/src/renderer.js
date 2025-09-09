import * as THREE from 'three';
import { CameraControls } from './cameraControls.js';
import BspRenderer from './bspRenderer.js';

// see https://github.com/mrdoob/three.js/blob/master/examples/misc_controls_pointerlock.html for better first person controls

//const information = document.getElementById('info');
//information.innerText = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`;

let scene = null;

let bspObject = null;

const width = window.innerWidth, height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(70, width / height, 1, 50000);


const func = async () => {
  // potears3 is the smallest bsp file
  //bspObject = await bsp.load('potears3');
  bspObject = await bsp.load('pandemonium');
  //bspObject = await bsp.load('gvillage');
  //bspObject = await bsp.load('keep');
  const bspRenderer = new BspRenderer(bspObject);
  scene = await bspRenderer.convertToScene();

  const InfoPlayerStart = bspObject.entities.find(ent => ent.classname === 'info_player_start');
  camera.matrix.identity();
  //camera.updateMatrixWorld();
  // Camera looks along its -z axis.
  console.log(InfoPlayerStart.angle);

  // angle is 270, need to rotate to 180

  camera.rotateY(THREE.MathUtils.degToRad(InfoPlayerStart.angle - 90));

  camera.position.set(InfoPlayerStart.origin[0], InfoPlayerStart.origin[2] + 70, -InfoPlayerStart.origin[1]);
};

func();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const controls = new CameraControls(camera, renderer.domElement);

const onKeyDown = function (event) {

  switch (event.code) {

    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;

    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;

    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;

    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;

    case 'KeyR':
      moveUp = true;
      break; 
    case 'KeyF':
      moveDown = true;
      break;
  }

};

const onKeyUp = function (event) {

  switch (event.code) {

    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;

    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;

    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;

    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
    case 'KeyR':
      moveUp = false;
      break; 
    case 'KeyF':
      moveDown = false;
      break;
  }

};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

document.addEventListener('click', function () {
  controls.lock();
});

window.addEventListener('resize', onWindowResize);

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();
// animation
function animate() {
  const time = performance.now();
  if (controls.isLocked === true) {
    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 4000.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 4000.0 * delta;

    controls.moveRight(- velocity.x * delta);
    controls.moveForward(- velocity.z * delta);

    if (moveUp) controls.object.position.y += ( 400.0 * delta );
    if (moveDown) controls.object.position.y -= ( 400.0 * delta );


  }
  if (scene) {
    prevTime = time;
    renderer.render(scene, camera);
  }
}
