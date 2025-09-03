import * as THREE from 'three';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import BspRenderer from './bspRenderer.js';

//const information = document.getElementById('info');
//information.innerText = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`;

let scene = null;
let controls = null;
let bspObject = null;

const width = window.innerWidth, height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 50000);
const clock = new THREE.Clock();

const func = async () => {
  // potears3 is the smallest bsp file
  //bspObject = await bsp.load('potears3');
  bspObject = await bsp.load('pandemonium');
  const bspRenderer = new BspRenderer(bspObject);
  scene = await bspRenderer.convertToScene();

  const InfoPlayerStart = bspObject.entities.find(ent => ent.classname === 'info_player_start');
  camera.matrix.identity();
  camera.up.set(0, 0, 1);
  // Camera looks along its z axis and we want it to look along world y so rotate 90 deg around x.
  //camera.rotateX(THREE.MathUtils.degToRad(90));
  //camera.rotateY(THREE.MathUtils.degToRad(InfoPlayerStart.angle));
  camera.rotateX(THREE.MathUtils.degToRad(InfoPlayerStart.angle));
  camera.position.set(InfoPlayerStart.origin[0], InfoPlayerStart.origin[1], InfoPlayerStart.origin[2]);
  
  console.log(camera)
};

func();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

controls = new FirstPersonControls( camera, renderer.domElement );
controls.movementSpeed = 150;
controls.lookSpeed = 0.1;

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

  controls.handleResize();

}

// animation
function animate(time) {
  if (scene) {
    controls.update( clock.getDelta() );
    renderer.render(scene, camera);
  }
}
