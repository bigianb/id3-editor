import * as THREE from 'three';
import BspRenderer from './bspRenderer.js';

//const information = document.getElementById('info');
//information.innerText = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`;

let scene = new THREE.Scene();

const func = async () => {
  // potears3 is the smallest bsp file
  const response = await bsp.load('potears3');
  const bspRenderer = new BspRenderer(response);
  scene = bspRenderer.convertToScene();
};

func();

const width = window.innerWidth, height = window.innerHeight;

// init

const camera = new THREE.PerspectiveCamera( 70, width / height, 0.1, 50000 );
camera.position.z = 2000;

//const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
//const material = new THREE.MeshNormalMaterial()
//const mesh = new THREE.Mesh( geometry, material );
//scene.add( mesh );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( width, height );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// animation

function animate( time ) {

	//mesh.rotation.x = time / 2000;
	//mesh.rotation.y = time / 1000;

	renderer.render( scene, camera );

}
