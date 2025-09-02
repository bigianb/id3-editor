import * as THREE from 'three';
import BspRenderer from './bspRenderer.js';

//const information = document.getElementById('info');
//information.innerText = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`;

let scene = null;

const func = async () => {
  // potears3 is the smallest bsp file
  const response = await bsp.load('potears3');
  const bspRenderer = new BspRenderer(response);
  scene = await bspRenderer.convertToScene();
};

func();

const width = window.innerWidth, height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 50000);

/*
{
"classname" "info_player_start"
"angle" "90"
"origin" "-832 -1360 200"
"targetname" "potears3_start1"
}
*/
camera.position.x = -832;
camera.position.y = -1360;
camera.position.z = 200;

camera.up.set(0, 0, 1);
camera.lookAt(-832, 0, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// animation
function animate(time) {
  if (scene) {
    renderer.render(scene, camera);
  }
}
